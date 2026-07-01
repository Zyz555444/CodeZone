'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileSearch, Bug, Wand2, MessageSquare, Loader2, X, TestTube, BookOpen } from 'lucide-react';
import { streamChat } from '@/lib/ai';
import { useEditorCommandBus } from '@/components/EditorCommandBus';

interface Position {
  top: number;
  left: number;
}

interface InlineAIMenuProps {
  selectedText: string;
  language: string;
  position: Position;
  onClose: () => void;
  projectId?: string;
  teamId?: string;
}

type AIAction = 'explain' | 'fix' | 'refactor' | 'comment' | 'test' | 'docs';

const MENU_WIDTH = 360;
const MENU_MAX_HEIGHT = 400;

export function InlineAIMenu({ selectedText, language, position, onClose, projectId, teamId }: InlineAIMenuProps) {
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { emitCommand } = useEditorCommandBus();

  const adjustedPosition = useCallback((): React.CSSProperties => {
    const style: React.CSSProperties = { top: position.top, left: position.left };
    if (typeof window === 'undefined') return style;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (position.left + MENU_WIDTH > vw - 16) {
      style.left = Math.max(8, vw - MENU_WIDTH - 16);
    }
    if (position.top + 200 > vh - 16) {
      style.bottom = vh - position.top + 8;
      delete style.top;
    }
    if (position.left < 8) {
      style.left = 8;
    }

    return style;
  }, [position]);

  const callStreamAI = useCallback(async (action: AIAction, systemPrompt: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setActiveAction(action);
    setStreamContent('');

    try {
      await streamChat(
        {
          projectId: projectId || '',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: selectedText },
          ],
          teamId,
        },
        {
          onToken: (token) => {
            setStreamContent((prev) => prev + token);
          },
          onDone: () => {
            setLoading(false);
          },
          onError: (error) => {
            setStreamContent(error.suggestion ? `${error.message}。${error.suggestion}` : error.message);
            setLoading(false);
          },
        },
        abortRef.current.signal,
      );
    } catch {
      setLoading(false);
    }
  }, [selectedText, projectId, teamId]);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setActiveAction(null);
    setStreamContent('');
    setLoading(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleClose]);

  const cleanCodeResult = (text: string): string => {
    return text
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim();
  };

  const applyDiff = useCallback((replacement: string) => {
    emitCommand({ type: 'diff', payload: { old: selectedText, new: replacement } });
    handleClose();
  }, [emitCommand, selectedText, handleClose]);

  const applyReplace = useCallback((replacement: string) => {
    emitCommand({ type: 'replace', payload: { text: replacement } });
    handleClose();
  }, [emitCommand, handleClose]);

  const actions: { key: AIAction; label: string; icon: React.ReactNode; prompt: string; diffEditor: boolean }[] = [
    {
      key: 'explain', label: '解释', icon: <FileSearch className="h-3.5 w-3.5" />, diffEditor: false,
      prompt: `You are an expert ${language} developer. Explain the following code clearly and concisely in Chinese.`,
    },
    {
      key: 'fix', label: '修复', icon: <Bug className="h-3.5 w-3.5" />, diffEditor: true,
      prompt: `You are an expert ${language} developer. Find and fix bugs in the following code. Return ONLY the fixed code without markdown fences.`,
    },
    {
      key: 'refactor', label: '优化', icon: <Wand2 className="h-3.5 w-3.5" />, diffEditor: true,
      prompt: `You are an expert ${language} developer. Refactor the following code to improve quality, readability, and performance. Return ONLY the refactored code without markdown fences.`,
    },
    {
      key: 'comment', label: '注释', icon: <MessageSquare className="h-3.5 w-3.5" />, diffEditor: true,
      prompt: `You are an expert ${language} developer. Add helpful comments to the following code. Return ONLY the commented code without markdown fences.`,
    },
    {
      key: 'test', label: '测试', icon: <TestTube className="h-3.5 w-3.5" />, diffEditor: true,
      prompt: `You are an expert ${language} developer. Generate comprehensive unit tests for the following code. Return ONLY the test code without markdown fences.`,
    },
    {
      key: 'docs', label: '文档', icon: <BookOpen className="h-3.5 w-3.5" />, diffEditor: false,
      prompt: `You are an expert ${language} developer. Generate documentation for the following code. Return ONLY the documentation without markdown fences.`,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-neutral-1 border border-neutral-4 rounded-xl shadow-float"
      style={adjustedPosition()}
    >
      {!activeAction ? (
        <div className="p-1.5 flex flex-wrap gap-1 max-w-[360px]">
          {actions.map((act) => (
            <button
              key={act.key}
              onClick={() => callStreamAI(act.key, act.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-label-12 rounded-lg hover:bg-neutral-2 text-neutral-7 hover:text-neutral-9 transition-colors disabled:opacity-50"
            >
              {act.icon}
              {act.label}
            </button>
          ))}
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-neutral-2 text-neutral-6 ml-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : loading ? (
        <div className="p-3" style={{ maxWidth: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-label-12 font-medium text-neutral-8">
              {actions.find(a => a.key === activeAction)?.label} 生成中...
            </span>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            <button onClick={handleClose} className="ml-auto p-0.5 rounded hover:bg-neutral-2 text-neutral-6">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="text-label-12 text-neutral-8 whitespace-pre-wrap font-mono bg-neutral-1 border border-neutral-4 p-2 rounded-lg max-h-60 overflow-y-auto">
            {streamContent || '...'}
          </pre>
        </div>
      ) : (
        <div className="p-3" style={{ maxWidth: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-12 font-medium text-neutral-8">
              {actions.find(a => a.key === activeAction)?.label} 结果
            </span>
            <div className="flex items-center gap-1">
              {actions.find(a => a.key === activeAction)?.diffEditor && (
                <button
                  onClick={() => applyDiff(cleanCodeResult(streamContent))}
                  className="px-2 py-0.5 text-label-12 rounded-md bg-accent text-white hover:bg-accent/90"
                >
                  查看 Diff
                </button>
              )}
              <button
                onClick={() => applyReplace(cleanCodeResult(streamContent))}
                className="px-2 py-0.5 text-label-12 rounded-md bg-success text-white hover:bg-success/80"
              >
                应用
              </button>
              <button onClick={handleClose} className="p-0.5 rounded hover:bg-neutral-2 text-neutral-6">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <pre className="text-label-12 text-neutral-8 whitespace-pre-wrap font-mono bg-neutral-1 border border-neutral-4 p-2 rounded-lg max-h-60 overflow-y-auto">
            {streamContent}
          </pre>
        </div>
      )}
    </div>
  );
}
