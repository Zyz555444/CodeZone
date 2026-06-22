'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileSearch, Bug, Wand2, MessageSquare, Loader2, X } from 'lucide-react';
import { authFetch } from '@/lib/utils';
import { apiUrl } from '@/lib/env';

interface Position {
  top: number;
  left: number;
}

interface InlineAIMenuProps {
  selectedText: string;
  language: string;
  position: Position;
  onClose: () => void;
  onResult: (action: string, text: string) => void;
}

type AIAction = 'explain' | 'fix' | 'refactor' | 'comment';

export function InlineAIMenu({ selectedText, language, position, onClose, onResult }: InlineAIMenuProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);

  const callAI = useCallback(async (action: AIAction, prompt: string) => {
    setLoading(true);
    setActiveAction(action);
    setResult('');
    try {
      const res = await authFetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are an expert ${language} developer. ${prompt} Respond in Chinese.` },
            { role: 'user', content: selectedText },
          ],
        }),
      });
      if (!res.ok) throw new Error('AI 请求失败');
      const data = await res.json();
      const text = data.reply || '';
      setResult(text);
      onResult(action, text);
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, [selectedText, language, onResult]);

  const actions: { key: AIAction; label: string; icon: React.ReactNode; prompt: string }[] = [
    {
      key: 'explain', label: '解释', icon: <FileSearch className="h-3.5 w-3.5" />,
      prompt: 'Explain the following code clearly and concisely.',
    },
    {
      key: 'fix', label: '修复', icon: <Bug className="h-3.5 w-3.5" />,
      prompt: 'Find and fix bugs, issues, or problems in the following code. Return ONLY the fixed code, no explanation.',
    },
    {
      key: 'refactor', label: '优化', icon: <Wand2 className="h-3.5 w-3.5" />,
      prompt: 'Refactor the following code to improve quality, readability, and performance. Return ONLY the refactored code.',
    },
    {
      key: 'comment', label: '注释', icon: <MessageSquare className="h-3.5 w-3.5" />,
      prompt: 'Add helpful comments to the following code. Return ONLY the commented code.',
    },
  ];

  return (
    <div
      className="absolute z-50 bg-white border border-neutral-3 rounded-xl shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {!activeAction ? (
        <div className="p-1.5 flex gap-1">
          {actions.map((act) => (
            <button
              key={act.key}
              onClick={() => callAI(act.key, act.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-2 text-neutral-7 hover:text-neutral-9 transition-colors disabled:opacity-50"
            >
              {act.icon}
              {act.label}
            </button>
          ))}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-2 text-neutral-6 ml-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : loading ? (
        <div className="p-3 flex items-center gap-2 text-sm text-neutral-6">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span>AI 处理中...</span>
        </div>
      ) : (
        <div className="p-3 max-w-lg max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-8">
              {actions.find(a => a.key === activeAction)?.label} 结果
            </span>
            <button onClick={onClose} className="p-0.5 rounded hover:bg-neutral-2 text-neutral-6">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="text-xs text-neutral-8 whitespace-pre-wrap font-mono bg-neutral-2 p-2 rounded-lg">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
