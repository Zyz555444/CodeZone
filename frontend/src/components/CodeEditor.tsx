'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { wsService } from '@/lib/websocket';
import { useAuthStore } from '@/stores/authStore';

interface CodeEditorProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  position: {
    lineNumber: number;
    column: number;
  };
}

interface CodeChangeData {
  projectId: string;
  fileId: string;
  content: string;
  userId: string;
}

interface CursorMoveData {
  projectId: string;
  fileId: string;
  position: {
    lineNumber: number;
    column: number;
  };
  userId: string;
  userName?: string;
}

interface OnlineUsersData {
  users: string[];
  count: number;
}

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

const DEBOUNCE_MS = 150;

export function CodeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  height = '600px',
}: CodeEditorProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const [content, setContent] = useState(initialContent);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteChangeRef = useRef(false);
  const decorationsRef = useRef<string[]>([]);

  const getCursorColor = useCallback((userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }, []);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, fileId]);

  useEffect(() => {
    const currentUserId = user?.id;

    const handleCodeChange = (data: CodeChangeData) => {
      if (data.fileId === fileId && editorRef.current && currentUserId && data.userId !== currentUserId) {
        isRemoteChangeRef.current = true;
        const editor = editorRef.current;
        const currentPosition = editor.getPosition();
        editor.setValue(data.content);
        if (currentPosition) {
          editor.setPosition(currentPosition);
        }
        setContent(data.content);
        isRemoteChangeRef.current = false;
      }
    };

    const handleCursorMove = (data: CursorMoveData) => {
      if (data.fileId === fileId && currentUserId && data.userId !== currentUserId) {
        setRemoteCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === data.userId);
          const newCursor: RemoteCursor = {
            userId: data.userId,
            userName: data.userName || '用户',
            color: getCursorColor(data.userId),
            position: data.position,
          };

          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newCursor;
            return updated;
          }
          return [...prev, newCursor];
        });
      }
    };

    const handleOnlineUsers = (data: OnlineUsersData) => {
      setOnlineUsers(data.users || []);
      setOnlineCount(data.count || data.users?.length || 0);
    };

    wsService.onCodeChange(handleCodeChange);
    wsService.onCursorMove(handleCursorMove);
    wsService.onOnlineUsers(handleOnlineUsers);

    return () => {
      wsService.offCodeChange(handleCodeChange);
      wsService.offCursorMove(handleCursorMove);
      wsService.offOnlineUsers(handleOnlineUsers);
    };
  }, [fileId, user?.id, getCursorColor]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const oldDecorations = decorationsRef.current.slice();
    decorationsRef.current = [];

    remoteCursors.forEach((cursor) => {
      const className = `remote-cursor-decoration-${cursor.userId}`;
      const decos = editor.deltaDecorations(oldDecorations, [
        {
          range: new monaco.Range(
            cursor.position.lineNumber,
            cursor.position.column,
            cursor.position.lineNumber,
            cursor.position.column
          ),
          options: {
            className,
            beforeContentClassName: `remote-cursor-before-${cursor.userId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
      ]);
      decorationsRef.current = [...decorationsRef.current, ...decos];
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [remoteCursors]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
      const pos = {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      };
      setCursorPosition(pos);

      wsService.sendCursorMove({
        projectId,
        fileId,
        position: pos,
      });
    });
  };

  const debouncedSendCodeChange = useCallback(
    (newContent: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        wsService.sendCodeChange({
          projectId,
          fileId,
          content: newContent,
        });
      }, DEBOUNCE_MS);
    },
    [projectId, fileId]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      const newContent = value || '';
      setContent(newContent);

      if (!isRemoteChangeRef.current) {
        debouncedSendCodeChange(newContent);
      }
    },
    [debouncedSendCodeChange]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const editorTheme = useMemo(() => {
    return theme === 'dark' ? 'vs-dark' : 'light';
  }, [theme]);

  return (
    <div className="relative" style={{ height }}>
      <Editor
        height={height}
        language={language}
        value={content}
        theme={editorTheme}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          wordBasedSuggestions: 'currentDocument',
        }}
      />

      <style jsx global>{`
        ${remoteCursors
          .map(
            (cursor) => `
          .remote-cursor-decoration-${cursor.userId} {
            background-color: ${cursor.color}33;
            border-left: 2px solid ${cursor.color};
            width: 100% !important;
          }
          .remote-cursor-before-${cursor.userId}::before {
            content: '${cursor.userName}';
            position: absolute;
            top: -1.2em;
            left: 0;
            background-color: ${cursor.color};
            color: white;
            padding: 0 4px;
            font-size: 10px;
            line-height: 16px;
            border-radius: 2px;
            white-space: nowrap;
            z-index: 10;
          }
        `
          )
          .join('\n')}
      `}</style>

      <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((userId, index) => (
            <div
              key={userId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                backgroundColor: COLORS[index % COLORS.length],
              }}
            >
              {userId.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
        {onlineUsers.length > 5 && (
          <span className="text-xs text-neutral-6">+{onlineUsers.length - 5}</span>
        )}
        <span className="text-xs text-neutral-6">{onlineCount} 在线</span>
      </div>
    </div>
  );
}
