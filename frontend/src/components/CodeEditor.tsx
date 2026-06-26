'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { wsService } from '@/lib/websocket';
import { useAuthStore } from '@/stores/authStore';
import { GhostTextProvider } from './GhostTextProvider';
import { InlineAIMenu } from './InlineAIMenu';
import { InlineDiffEditor } from './InlineDiffEditor';
import { agentExecute } from '@/lib/ai';
import { useAIStore } from '@/stores/aiStore';

interface CodeEditorProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  teamId?: string;
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

export function CodeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  height = '600px',
  teamId,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const [content, setContent] = useState(initialContent);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null>(null);
  const [aiMenuPosition, setAiMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [inlinePrompt, setInlinePrompt] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const inlineInputRef = useRef<string>('');

  const abortRef = useRef<AbortController | null>(null);
  const cursorThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorStyleRef = useRef<HTMLStyleElement | null>(null);
  const isRemoteChangeRef = useRef(false);

  const DEBOUNCE_MS = 150;

  const getCursorColor = useCallback((userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }, []);

  const updateRemoteCursorDecorations = useCallback(
    (cursors: RemoteCursor[]) => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const decorations: editor.IModelDeltaDecoration[] = [];

      cursors.forEach((cursor, idx) => {
        if (cursor.position) {
          decorations.push({
            range: {
              startLineNumber: cursor.position.lineNumber,
              startColumn: cursor.position.column,
              endLineNumber: cursor.position.lineNumber,
              endColumn: cursor.position.column + 1,
            },
            options: {
              className: `remote-cursor-decoration-${cursor.userId}`,
              stickiness: 0,
            },
          });

          if (!cursorStyleRef.current) {
            cursorStyleRef.current = document.createElement('style');
            document.head.appendChild(cursorStyleRef.current);
          }

          const styles = `
            .remote-cursor-decoration-${cursor.userId} {
              background-color: ${cursor.color}40;
            }
            .remote-cursor-decoration-${cursor.userId}::before {
              content: '${cursor.userName || cursor.userId.slice(0, 2)}';
              position: absolute;
              top: -1.2em;
              left: 0;
              background: ${cursor.color};
              color: white;
              font-size: 10px;
              padding: 1px 4px;
              border-radius: 3px;
              white-space: nowrap;
              z-index: 10;
            }
          `;

          cursorStyleRef.current.textContent = styles;
        }
      });

      editor.deltaDecorations(
        editor.getModel()?.getAllDecorations()?.map((d) => d.id).filter((id) =>
          id.includes('remote-cursor') || id === 'cursor-style',
        ) || [],
        decorations,
      );
    },
    [],
  );

  const sendCodeChange = useCallback(
    (newContent: string) => {
      if (isRemoteChangeRef.current) {
        isRemoteChangeRef.current = false;
        return;
      }
      wsService.sendCodeChange({
        projectId,
        fileId,
        content: newContent,
      } as CodeChangeData);
    },
    [projectId, fileId, user],
  );

  const debouncedSendCodeChange = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      if (debouncedSendCodeChange.current) {
        clearTimeout(debouncedSendCodeChange.current);
      }
      debouncedSendCodeChange.current = setTimeout(() => {
        sendCodeChange(newContent);
      }, DEBOUNCE_MS);
    },
    [sendCodeChange],
  );

  useEffect(() => {
    const onCodeChange = (data: unknown) => {
      const change = data as CodeChangeData;
      if (change.fileId === fileId && change.userId !== user?.id) {
        isRemoteChangeRef.current = true;
        setContent(change.content);
        if (editorRef.current) {
          editorRef.current.setValue(change.content);
        }
      }
    };

    const onCursorMove = (data: unknown) => {
      const move = data as CursorMoveData;
      if (move.fileId === fileId && move.userId !== user?.id) {
        setRemoteCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === move.userId);
          const newCursor: RemoteCursor = {
            userId: move.userId,
            userName: move.userName || move.userId.slice(0, 2),
            color: getCursorColor(move.userId),
            position: move.position,
          };
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = newCursor;
            return next;
          }
          return [...prev, newCursor];
        });
      }
    };

    const onOnlineUsers = (data: unknown) => {
      const online = data as OnlineUsersData;
      setOnlineUsers(online.users || []);
      setOnlineCount(online.count || 0);
    };

    wsService.on('code:change', onCodeChange);
    wsService.on('code:cursor_move', onCursorMove);
    wsService.on('code:online_users', onOnlineUsers);

    return () => {
      wsService.off('code:change', onCodeChange);
      wsService.off('code:cursor_move', onCursorMove);
      wsService.off('code:online_users', onOnlineUsers);
    };
  }, [fileId, user, getCursorColor]);

  useEffect(() => {
    updateRemoteCursorDecorations(remoteCursors);
  }, [remoteCursors, updateRemoteCursorDecorations]);

  const handleEditorMount: OnMount = useCallback(
    (editorInst, monacoInst) => {
      editorRef.current = editorInst;
      monacoRef.current = monacoInst;

      editorInst.onDidChangeCursorPosition((e) => {
        if (cursorThrottleTimerRef.current) return;
        cursorThrottleTimerRef.current = setTimeout(() => {
          cursorThrottleTimerRef.current = null;
          wsService.sendCursorMove({
            projectId,
            fileId,
            position: {
              lineNumber: e.position.lineNumber,
              column: e.position.column,
            },
          });
        }, 50);
      });

      editorInst.addAction({
        id: 'ai-inline-prompt',
        label: 'AI Inline Prompt',
        keybindings: [monacoInst.KeyMod.CtrlCmd | monacoInst.KeyCode.KeyK],
        run: () => {
          setInlinePrompt(true);
        },
      });

      editorInst.onDidChangeModelContent(() => {
        // handled by onChange
      });

      editorInst.onMouseUp(() => {
        const selection = editorInst.getSelection();
        if (selection && !selection.isEmpty()) {
          const text = editorInst.getModel()?.getValueInRange(selection) || '';
          setSelectedText(text);
          setSelectedRange({
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn,
          });
          const pos = editorInst.getScrolledVisiblePosition(selection.getStartPosition());
          if (pos) {
            const editorDom = editorInst.getDomNode();
            if (editorDom) {
              const rect = editorDom.getBoundingClientRect();
              setAiMenuPosition({
                top: pos.top + 20,
                left: pos.left,
              });
            }
          }
        } else {
          setAiMenuPosition(null);
        }
      });
    },
    [projectId, fileId, user],
  );

  const handleApplyEdit = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor || !selectedRange) return;

    editor.executeEdits('ai-inline-menu', [{
      range: selectedRange,
      text,
    }]);

    setAiMenuPosition(null);
    setSelectedText('');
    setSelectedRange(null);
  }, [selectedRange]);

  const handleAgentClose = useCallback(() => {
    setInlinePrompt(false);
    setAgentRunning(false);
    inlineInputRef.current = '';
    abortRef.current?.abort();
  }, []);

  return (
    <div style={{ height, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {agentRunning && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-1.5 px-2 py-1 bg-accent/10 backdrop-blur-sm rounded-lg border border-accent/20">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          <span className="text-xs text-accent">Agent 执行中...</span>
          <button onClick={handleAgentClose} className="ml-1 text-xs text-neutral-6 hover:text-neutral-9">
            Esc 取消
          </button>
        </div>
      )}

      <div className="absolute top-2 left-2 z-40 hidden lg:flex items-center gap-1 px-2 py-0.5 bg-neutral-1/80 backdrop-blur-sm rounded-lg border border-neutral-4 text-xs text-neutral-6">
        {onlineCount > 0 && (
          <span>{onlineCount} 在线</span>
        )}
        <span className="text-neutral-5">Ctrl+K</span>
        <span>AI 指令</span>
      </div>

      <GhostTextProvider
        editor={editorRef.current}
        monaco={monacoRef.current}
        language={language}
        enabled={!agentRunning}
      />

      <Editor
        height="100%"
        language={language}
        value={content}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onChange={(val) => val !== undefined && handleContentChange(val)}
        onMount={handleEditorMount}
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          padding: { top: 8 },
        }}
      />

      {aiMenuPosition && selectedText && (
        <InlineAIMenu
          selectedText={selectedText}
          language={language}
          position={aiMenuPosition}
          onClose={() => {
            setAiMenuPosition(null);
            setSelectedText('');
            setSelectedRange(null);
          }}
          onApplyEdit={handleApplyEdit}
          projectId={projectId}
          teamId={teamId}
        />
      )}

      {inlinePrompt && (
        <InlinePrompt
          editor={editorRef.current}
          language={language}
          onClose={handleAgentClose}
          projectId={projectId}
          teamId={teamId}
          onAgentStateChange={setAgentRunning}
          abortRef={abortRef}
          model={monacoRef.current}
        />
      )}
    </div>
  );
}

function InlinePrompt({
  editor: editorInst,
  language,
  onClose,
  projectId,
  teamId,
  onAgentStateChange,
  abortRef,
  model: _model,
}: {
  editor: Parameters<OnMount>[0] | null;
  language: string;
  onClose: () => void;
  projectId: string;
  teamId?: string;
  onAgentStateChange: (running: boolean) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  model: typeof import('monaco-editor') | null;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const store = useAIStore;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !editorInst) return;
    setLoading(true);
    setResult('');
    onAgentStateChange(true);

    const selection = editorInst.getSelection();
    const selectedCode = selection && !selection.isEmpty()
      ? editorInst.getModel()?.getValueInRange(selection) || ''
      : '';

    try {
      const task = selectedCode
        ? `请根据以下指令修改代码:\n\n现有代码:\n\`\`\`${language}\n${selectedCode}\n\`\`\`\n\n指令: ${input}`
        : input;

      abortRef.current = new AbortController();

      await agentExecute(
        {
          task,
          projectId: projectId || '',
          teamId,
        },
        {
          onToken: (token) => {
            setResult((prev) => prev + token);
          },
          onThinking: (_content) => {},
          onToolCall: (_toolId, _toolName, _toolArgs) => {},
          onToolResult: (_toolId, _toolName, _result) => {},
          onWriteFile: (_filePath, _content) => {},
          onDone: (_convId, _totalTokens) => {
            setLoading(false);
            onAgentStateChange(false);
            setTimeout(() => onClose(), 500);
          },
          onError: (_error) => {
            setLoading(false);
            onAgentStateChange(false);
          },
        },
        abortRef.current.signal,
      );
    } catch {
      setLoading(false);
      onAgentStateChange(false);
    }
  }, [input, editorInst, language, projectId, teamId, onClose, onAgentStateChange, abortRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      if (loading) {
        abortRef.current?.abort();
      }
      onClose();
    }
  };

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-96 bg-white border border-neutral-4 rounded-xl shadow-float p-3">
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="用自然语言描述你要做什么..."
        className="w-full min-h-[60px] text-sm bg-neutral-1 border border-neutral-4 rounded-lg p-2 resize-none outline-none focus:border-accent/50"
        rows={3}
        disabled={loading}
      />
      {result && (
        <pre className="mt-2 text-xs text-neutral-7 whitespace-pre-wrap font-mono bg-neutral-1 border border-neutral-4 p-2 rounded-lg max-h-32 overflow-auto">
          {result}
        </pre>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-neutral-6">{loading ? 'Agent 正在执行任务...' : 'Enter 发送 · Esc 取消'}</span>
        <div className="flex gap-1.5">
          <button onClick={onClose} className="px-2.5 py-1 text-xs rounded-lg bg-neutral-3 text-neutral-7 hover:bg-neutral-4 transition-colors">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="px-2.5 py-1 text-xs rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '执行中...' : '执行'}
          </button>
        </div>
      </div>
    </div>
  );
}
