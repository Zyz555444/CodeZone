'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/authStore';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Awareness } from 'y-protocols/awareness';

interface CollaborativeEditorProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  wsUrl?: string;
}

const USER_COLORS = [
  '#C56473', '#3D6896', '#5E9F7E', '#A87A3D', '#A64953',
  '#7B68AE', '#C26E60', '#4A8B8B', '#B8860B', '#6B8E23',
  '#D36F80', '#5B7FA5', '#72AD89', '#BA9A50', '#B55D5A',
];

export function CollaborativeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  height = '600px',
  wsUrl,
}: CollaborativeEditorProps) {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [onlinePeers, setOnlinePeers] = useState(0);

  const backendUrl = wsUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10101';

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;

    const roomName = `code:${projectId}:${fileId}`;
    const provider = new WebsocketProvider(backendUrl, roomName, doc, {
      connect: true,
      params: {
        userId: user?.id || 'anonymous',
        userName: user?.username || '用户',
      },
    });
    providerRef.current = provider;

    const awareness: Awareness = provider.awareness;
    const userColor = USER_COLORS[
      Math.abs(hashCode(user?.id || 'anonymous')) % USER_COLORS.length
    ];

    awareness.setLocalStateField('user', {
      name: user?.username || '用户',
      color: userColor,
      colorLight: userColor + '33',
    });

    const ytext = doc.getText('content');
    if (initialContent && ytext.toString() === '') {
      ytext.insert(0, initialContent);
    }

    provider.on('status', (event: { status: string }) => {
      setConnecting(event.status === 'connecting');
    });

    function updatePeers() {
      const states = awareness.getStates();
      const peerCount = states.size;
      setOnlinePeers(peerCount);
    }

    awareness.on('change', updatePeers);

    const monacoBinding = new MonacoBinding(
      ytext,
      editorRef.current!.getModel()!,
      new Set([editorRef.current!]),
      awareness
    );
    bindingRef.current = monacoBinding;

    return () => {
      awareness.off('change', updatePeers);
      monacoBinding.destroy();
      provider.disconnect();
      doc.destroy();
    };
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const editorTheme = useMemo(() => {
    return theme === 'dark' ? 'vs-dark' : 'light';
  }, [theme]);

  return (
    <div className="relative border border-neutral-4 rounded-xl overflow-hidden" style={{ height }}>
      {connecting && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-warning/10 border-b border-warning/20 px-3 py-1.5">
          <p className="text-xs text-warning">正在连接协作服务器...</p>
        </div>
      )}

      <Editor
        height={height}
        language={language}
        defaultValue={initialContent}
        theme={editorTheme}
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

      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 bg-neutral-1/90 backdrop-blur px-3 py-1.5 rounded-lg border border-neutral-4">
        <div className="flex items-center gap-1.5" title={`${onlinePeers} 人在线协作`}>
          <div className={`w-2 h-2 rounded-full ${onlinePeers > 1 ? 'bg-success' : 'bg-neutral-4'}`} />
          <span className="text-xs text-neutral-7">
            {onlinePeers > 1 ? `${onlinePeers} 人协作中` : '仅自己'}
          </span>
        </div>
      </div>
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
