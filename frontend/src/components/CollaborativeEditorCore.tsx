'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness';
import type { editor, IDisposable } from 'monaco-editor';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface CollaborativeEditorCoreProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  wsUrl?: string;
  onContentChange?: (content: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
  onCursorMove?: (position: { line: number; column: number }) => void;
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

export function CollaborativeEditorCore({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  wsUrl,
  onContentChange,
  onMount,
  onCursorMove,
}: CollaborativeEditorCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [onlinePeers, setOnlinePeers] = useState(0);
  const initializedRef = useRef(false);

  const backendUrl = wsUrl || '/ws';

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
    if (initializedRef.current) return;
    initializedRef.current = true;

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
      });

      editorRef.current = editor;
      cleanupFns.push(() => editor.dispose());

      const doc = new Y.Doc();
      ydocRef.current = doc;

      const roomName = `code:${projectId}:${fileId}`;
      const provider = new WebsocketProvider(backendUrl, roomName, doc, {
        connect: true,
        params: { userId, userName: displayName },
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
      if (initialContent && ytext.toString() === '') {
        ytext.insert(0, initialContent);
      }

      const binding = new MonacoBinding(ytext, model, new Set([editor]), awareness);
      bindingRef.current = binding;

      if (onContentChange) {
        const disp = model.onDidChangeContent(() => {
          onContentChange(model.getValue());
        });
        disposablesRef.current.push(disp);
      }

      if (onCursorMove) {
        const disp = editor.onDidChangeCursorPosition((e) => {
          onCursorMove({ line: e.position.lineNumber, column: e.position.column });
        });
        disposablesRef.current.push(disp);
      }

      if (onMount) {
        onMount(editor, monaco);
      }

      editor.focus();

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
        <div className={`flex items-center gap-2 px-3 py-1 text-xs border-b ${
          status === 'connecting' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-red-50 border-red-200 text-red-600'
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
            </>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 w-full" />

      <div className="flex items-center justify-between px-3 py-1 bg-neutral-1 border-t border-neutral-3 text-[11px] text-neutral-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {status === 'connected' ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-neutral-5" />}
            {status === 'connected' ? `${onlinePeers} 人在线` : '离线'}
          </span>
          <span>{language}</span>
          <span>UTF-8</span>
          <span>2 空格</span>
        </div>
        <div className="flex items-center gap-3">
          {editorRef.current && (
            <span>
              行 {editorRef.current.getPosition()?.lineNumber || 1},
              列 {editorRef.current.getPosition()?.column || 1}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
