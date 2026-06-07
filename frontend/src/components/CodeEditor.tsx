'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { wsService } from '@/lib/websocket';
import { cn } from '@/lib/utils';

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

export function CodeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  height = '600px',
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState(initialContent);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    wsService.joinProject(projectId);

    wsService.onCodeChange((data) => {
      if (data.fileId === fileId && editorRef.current) {
        // 忽略自己的更改
        if (data.userId !== getCurrentUserId()) {
          setContent(data.content);
        }
      }
    });

    wsService.onCursorMove((data) => {
      if (data.fileId === fileId && data.userId !== getCurrentUserId()) {
        setRemoteCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === data.userId);
          const newCursor = {
            userId: data.userId,
            userName: data.userName || '用户',
            color: COLORS[parseInt(data.userId.slice(-1), 16) % COLORS.length],
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
    });

    wsService.onOnlineUsers((data) => {
      setOnlineUsers(data.users || []);
    });

    return () => {
      wsService.leaveProject(projectId);
      wsService.offCodeChange(() => {});
      wsService.offCursorMove(() => {});
      wsService.offOnlineUsers(() => {});
    };
  }, [projectId, fileId]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
      wsService.sendCursorMove({
        projectId,
        fileId,
        position: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });
  };

  const handleChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    
    wsService.sendCodeChange({
      projectId,
      fileId,
      content: newContent,
    });
  };

  const getCurrentUserId = () => {
    // TODO: 从 auth store 获取当前用户 ID
    return 'current-user';
  };

  return (
    <div className="relative" style={{ height }}>
      <Editor
        height={height}
        language={language}
        value={content}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
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
      
      {/* Remote Cursors */}
      {remoteCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            top: `${(cursor.position.lineNumber - 1) * 20}px`,
            left: `${cursor.position.column * 8.4}px`,
          }}
        >
          <div
            className="remote-cursor-label"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
          <div
            className="w-px h-5"
            style={{ backgroundColor: cursor.color }}
          />
        </div>
      ))}

      {/* Online Users Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((userId, index) => (
            <div
              key={userId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                backgroundColor: COLORS[parseInt(userId.slice(-1), 16) % COLORS.length],
                zIndex: index,
              }}
            >
              {userId.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
        {onlineUsers.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {onlineUsers.length} 人在线
          </span>
        )}
      </div>
    </div>
  );
}
