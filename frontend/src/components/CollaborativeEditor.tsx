'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness';
import type { editor, IDisposable } from 'monaco-editor';
import { Loader2, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { wsUrl } from '@/lib/env';
import { GhostTextProvider } from './GhostTextProvider';

interface CollaborativeEditorProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
  onCursorMove?: (position: { line: number; column: number }) => void;
  onSave?: () => void;
}

const USER_COLORS = [
  '#C56473', '#3D6896', '#5E9F7E', '#A87A3D', '#A64953',
  '#7B68AE', '#C26E60', '#4A8B8B', '#B8860B', '#6B8E23',
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function CollaborativeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  onContentChange,
  onMount,
  onCursorMove,
  onSave,
}: CollaborativeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [onlinePeers, setOnlinePeers] = useState(0);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, column: 1, selectionLength: 0 });
  const [wordWrap, setWordWrap] = useState(false);
  const [mountedEditor, setMountedEditor] = useState<editor.IStandaloneCodeEditor | null>(null);

  const callbacksRef = useRef({
    onSave,
    onContentChange,
    onCursorMove,
    onMount,
  });
  useEffect(() => {
    callbacksRef.current = { onSave, onContentChange, onCursorMove, onMount };
  });

  const baseUrl = wsUrl();

  const getUserId = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.userId || 'anonymous';
        }
      } catch {
        // noop
      }
    }
    return 'anonymous';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    const loadMonacoAndInit = async () => {
      const monaco = await import('monaco-editor');
      if (cancelled || !containerRef.current) return;
      monacoRef.current = monaco;

      const userId = getUserId();
      const displayName = typeof window !== 'undefined' ? localStorage.getItem('username') || '用户' : '用户';

      const modelUri = monaco.Uri.parse(`file:///${projectId}/${fileId}`);
      let model = monaco.editor.getModel(modelUri);
      if (!model) {
        model = monaco.editor.createModel(initialContent, language, modelUri);
      }

      const editor = monaco.editor.create(containerRef.current, {
        model,
        readOnly,
        minimap: { enabled: true, maxColumn: 80 },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: true, strings: false },
        wordBasedSuggestions: 'currentDocument',
        selectionHighlight: true,
        occurrencesHighlight: 'singleFile',
        codeLens: true,
        links: true,
        colorDecorators: true,
        padding: { top: 12 },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        renderLineHighlight: 'all',
        lineDecorationsWidth: 8,
        matchBrackets: 'always',
        stickyScroll: { enabled: true },
        folding: true,
        unfoldOnClickAfterEndOfLine: false,
        dragAndDrop: true,
        multiCursorModifier: 'ctrlCmd',
        emptySelectionClipboard: true,
      });

      // 注册常用编辑器命令
      editor.addAction({
        id: 'codezone-save-file',
        label: '保存文件',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => {
          callbacksRef.current.onSave?.();
          return undefined;
        },
      });

      editor.addAction({
        id: 'codezone-toggle-word-wrap',
        label: '切换自动换行',
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
        run: (ed) => {
          const next = (ed.getOption(monaco.editor.EditorOption.wordWrap) as unknown as string) === 'on' ? 'off' : 'on';
          ed.updateOptions({ wordWrap: next });
          setWordWrap(next === 'on');
          return undefined;
        },
      });

      editor.addAction({
        id: 'codezone-format-document',
        label: '格式化文档',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
        run: async (ed) => {
          try {
            await ed.getAction('editor.action.formatDocument')?.run();
          } catch {
            // 当前语言未配置格式化器时静默失败
          }
          return undefined;
        },
      });

      editorRef.current = editor;
      cleanupFns.push(() => editor.dispose());

      const doc = new Y.Doc();
      ydocRef.current = doc;

      const roomName = `code:${projectId}:${fileId}`;

      // 使用 y-socket.io 的 SocketIOProvider 替代 y-websocket 的 WebsocketProvider
      // SocketIOProvider 通过 Socket.IO 协议传输 Yjs 数据
      const provider = new SocketIOProvider(baseUrl, roomName, doc, {
        auth: { userId, userName: displayName },
        autoConnect: true,
      });
      providerRef.current = provider;

      provider.on('status', (event: { status: string }) => {
        if (cancelled) return;
        if (event.status === 'connected') setStatus('connected');
        else if (event.status === 'connecting') setStatus('connecting');
        else setStatus('disconnected');
      });

      const awareness = provider.awareness as Awareness;
      const userColor = USER_COLORS[hashCode(userId) % USER_COLORS.length];
      awareness.setLocalStateField('user', {
        name: displayName,
        color: userColor,
        colorLight: userColor + '33',
      });

      const updatePeers = () => {
        if (cancelled) return;
        setOnlinePeers(awareness.getStates().size);
      };
      awareness.on('change', updatePeers);

      const ytext = doc.getText('content');
      if (ytext.toString() === '') {
        // 如果模型已有内容（复用缓存或协作同步），优先同步到 Yjs；否则使用初始内容
        const seed = model.getValue() || initialContent || '';
        if (seed) {
          ytext.insert(0, seed);
        }
      }

      const binding = new MonacoBinding(ytext, model, new Set([editor]), awareness);
      bindingRef.current = binding;

      const onContentChangeRef = callbacksRef.current.onContentChange;
      if (onContentChangeRef) {
        const disp = model.onDidChangeContent(() => {
          onContentChangeRef(model.getValue());
        });
        disposablesRef.current.push(disp);
      }

      const updateCursorInfo = () => {
        const position = editor.getPosition();
        const selection = editor.getSelection();
        const selectionLength = selection && !selection.isEmpty()
          ? editor.getModel()?.getValueInRange(selection).length || 0
          : 0;
        setCursorInfo({
          line: position?.lineNumber || 1,
          column: position?.column || 1,
          selectionLength,
        });
      };

      disposablesRef.current.push(editor.onDidChangeCursorPosition(updateCursorInfo));
      disposablesRef.current.push(editor.onDidChangeCursorSelection(updateCursorInfo));

      const onCursorMoveRef = callbacksRef.current.onCursorMove;
      if (onCursorMoveRef) {
        const disp = editor.onDidChangeCursorPosition((e) => {
          onCursorMoveRef({ line: e.position.lineNumber, column: e.position.column });
        });
        disposablesRef.current.push(disp);
      }

      callbacksRef.current.onMount?.(editor, monaco);

      editor.focus();
      setMountedEditor(editor);

      cleanupFns.push(() => {
        disposablesRef.current.forEach(d => d.dispose());
        binding.destroy();
        provider.disconnect();
        doc.destroy();
        awareness.off('change', updatePeers);
      });
    };

    loadMonacoAndInit();

    return () => {
      cancelled = true;
      cleanupFns.forEach(fn => {
        try { fn(); } catch {
          // noop
        }
      });
      disposablesRef.current = [];
    };
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col">
      {status !== 'connected' && (
        <div className={`flex items-center gap-2 px-3 py-1 text-label-12 border-b ${
          status === 'connecting' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-error/10 border-error/30 text-error'
        }`}>
          {status === 'connecting' ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              正在连接协作服务器...
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              协作连接已断开
              <button
                onClick={() => providerRef.current?.connect()}
                className="ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-1/80 hover:bg-neutral-1 text-error border border-error/30"
                title="重新连接"
              >
                <RotateCcw className="h-3 w-3" />
                重连
              </button>
            </>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 w-full" />

      <GhostTextProvider
        editor={mountedEditor}
        monaco={monacoRef.current}
        language={language}
        enabled={status === 'connected'}
      />

      <div className="flex items-center justify-between px-3 py-1 bg-neutral-1 border-t border-neutral-3 text-label-12 text-neutral-6 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title={status === 'connected' ? '协作连接正常' : '协作连接异常'}>
            {status === 'connected' ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3 text-neutral-7" />}
            {status === 'connected' ? `${onlinePeers} 人在线` : '离线'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-2 border border-neutral-3">{language}</span>
          <span>UTF-8</span>
          <span>2 空格</span>
          {wordWrap && <span className="text-accent">自动换行</span>}
        </div>
        <div className="flex items-center gap-3">
          {cursorInfo.selectionLength > 0 && (
            <span>已选择 {cursorInfo.selectionLength} 字符</span>
          )}
          <span>
            行 {cursorInfo.line}, 列 {cursorInfo.column}
          </span>
        </div>
      </div>
    </div>
  );
}
