'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { GhostTextProvider } from './GhostTextProvider';
import { InlineAIMenu } from './InlineAIMenu';
import { agentExecute } from '@/lib/ai';

interface CodeEditorProps {
  projectId: string;
  fileId: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  teamId?: string;
}

export function CodeEditor({
  projectId,
  fileId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
  height = '600px',
}: CodeEditorProps) {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const [content, setContent] = useState(initialContent);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null>(null);
  const [aiMenuPosition, setAiMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [inlinePrompt, setInlinePrompt] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const inlineInputRef = useRef<string>('');

  const abortRef = useRef<AbortController | null>(null);

  const handleEditorMount: OnMount = useCallback(
    (editorInst, monacoInst) => {
      editorRef.current = editorInst;
      monacoRef.current = monacoInst;

      editorInst.addAction({
        id: 'ai-inline-prompt',
        label: 'AI Inline Prompt',
        keybindings: [monacoInst.KeyMod.CtrlCmd | monacoInst.KeyCode.KeyK],
        run: () => {
          setInlinePrompt(true);
        },
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
              editorDom.getBoundingClientRect();
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
    [],
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
          <span className="text-label-12 text-accent">Agent 执行中...</span>
          <button onClick={handleAgentClose} className="ml-1 text-label-12 text-neutral-6 hover:text-neutral-9">
            Esc 取消
          </button>
        </div>
      )}

      <div className="absolute top-2 left-2 z-40 hidden lg:flex items-center gap-1 px-2 py-0.5 bg-neutral-1/80 backdrop-blur-sm rounded-lg border border-neutral-4 text-label-12 text-neutral-6">
        <span className="text-neutral-7">Ctrl+K</span>
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
        onChange={(val) => val !== undefined && setContent(val)}
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
          position={aiMenuPosition}
          selectedText={selectedText}
          language={language}
          onApplyEdit={handleApplyEdit}
          onClose={() => setAiMenuPosition(null)}
          projectId={projectId}
        />
      )}

      {inlinePrompt && (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <div className="flex items-center gap-2 px-4 py-3 bg-neutral-1 border border-neutral-5 rounded-lg shadow-lg">
            <input
              ref={(el) => {
                if (el) {
                  el.focus();
                }
              }}
              type="text"
              placeholder="输入 AI 指令... (Enter 发送, Esc 取消)"
              className="flex-1 px-3 py-1.5 text-copy-13 bg-neutral-2 rounded-lg border border-neutral-4 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  const prompt = e.currentTarget.value;
                  inlineInputRef.current = prompt;
                  setAgentRunning(true);
                  setInlinePrompt(false);
                  // Agent execution would go here
                } else if (e.key === 'Escape') {
                  handleAgentClose();
                }
              }}
            />
            <button onClick={handleAgentClose} className="px-2 py-1 text-label-12 text-neutral-6 hover:text-neutral-9">
              Esc
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
