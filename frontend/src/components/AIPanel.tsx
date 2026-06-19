'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Loader2, Send, Sparkles, Code2, MessageSquare, FileSearch, Bug, Wand2, Copy, Check, X } from 'lucide-react';
import { apiUrl } from '@/lib/env';
import { authFetch } from '@/lib/utils';

type AITab = 'chat' | 'explain' | 'review' | 'generate';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIPanelProps {
  code: string;
  language: string;
  onInsertCode: (code: string) => void;
  onClose: () => void;
  position?: 'right' | 'bottom';
}

const TAB_ITEMS: { key: AITab; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: 'AI Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { key: 'explain', label: '解释', icon: <FileSearch className="h-3.5 w-3.5" /> },
  { key: 'review', label: '审查', icon: <Bug className="h-3.5 w-3.5" /> },
  { key: 'generate', label: '生成', icon: <Wand2 className="h-3.5 w-3.5" /> },
];

export function AIPanel({ code, language, onInsertCode, onClose, position = 'right' }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<AITab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, result]);

  const callAI = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    const res = await authFetch(apiUrl(`/api/ai/${endpoint}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `请求失败 (${res.status})`);
    }

    return res.json();
  }, []);

  const handleChatSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const data = await callAI('chat', {
        messages: [
          { role: 'system', content: `You are a helpful coding assistant. The user is working with ${language} code. Be concise and helpful.` },
          ...messages.slice(-4),
          userMsg,
        ],
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!code || loading) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await callAI('explain', { code, language });
      setResult(data.explanation);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!code || loading) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await callAI('review', { code, language });
      setResult(data.review);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await callAI('generate', { description: input, language, context: code });
      setResult(data.code);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center text-neutral-6 text-sm py-8">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 text-accent/60" />
                  <p>AI 编码助手已就绪</p>
                  <p className="text-xs mt-1">可以询问代码问题、请求帮助等</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-neutral-2 text-neutral-9'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-2 rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-neutral-3 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                  placeholder="向 AI 提问..."
                  className="flex-1 bg-neutral-2 border border-neutral-3 rounded-lg px-3 py-2 text-sm text-neutral-9 placeholder-neutral-6 focus:outline-none focus:border-accent/50"
                />
                <Button onClick={handleChatSend} disabled={loading || !input.trim()} size="sm" className="px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 'explain':
        return (
          <div className="flex flex-col h-full p-3">
            <div className="flex gap-2 mb-3">
              <Button onClick={handleExplain} disabled={loading || !code} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
                解释当前代码
              </Button>
            </div>
            {result && (
              <div className="flex-1 min-h-0 relative">
                <div className="absolute top-2 right-2 z-10">
                  <button onClick={() => handleCopy(result)} className="p-1.5 rounded-lg hover:bg-neutral-3 text-neutral-6 hover:text-neutral-9 transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="bg-neutral-2 rounded-xl p-4 text-sm text-neutral-9 whitespace-pre-wrap h-full overflow-y-auto leading-relaxed">
                  {result}
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col h-full p-3">
            <div className="flex gap-2 mb-3">
              <Button onClick={handleReview} disabled={loading || !code} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />}
                审查代码
              </Button>
            </div>
            {result && (
              <div className="flex-1 min-h-0 relative">
                <div className="absolute top-2 right-2 z-10">
                  <button onClick={() => handleCopy(result)} className="p-1.5 rounded-lg hover:bg-neutral-3 text-neutral-6 hover:text-neutral-9 transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="bg-neutral-2 rounded-xl p-4 text-sm text-neutral-9 whitespace-pre-wrap h-full overflow-y-auto leading-relaxed">
                  {result}
                </div>
              </div>
            )}
          </div>
        );

      case 'generate':
        return (
          <div className="flex flex-col h-full p-3">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="描述你要生成的代码..."
                className="flex-1 bg-neutral-2 border border-neutral-3 rounded-lg px-3 py-2 text-sm text-neutral-9 placeholder-neutral-6 focus:outline-none focus:border-accent/50"
              />
              <Button onClick={handleGenerate} disabled={loading || !input.trim()} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                生成
              </Button>
            </div>
            {result && (
              <div className="flex-1 min-h-0 relative">
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <button onClick={() => handleCopy(result)} className="p-1.5 rounded-lg hover:bg-neutral-3 text-neutral-6 hover:text-neutral-9 transition-colors" title="复制">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => onInsertCode(result)} className="p-1.5 rounded-lg hover:bg-accent/10 text-neutral-6 hover:text-accent transition-colors" title="插入到编辑器">
                    <Code2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="bg-neutral-2 rounded-xl p-4 text-sm text-neutral-9 h-full overflow-auto font-mono">
                  <code>{result}</code>
                </pre>
              </div>
            )}
          </div>
        );
    }
  };

  const isRight = position === 'right';

  return (
    <div className={`bg-white border-neutral-3 flex flex-col ${
      isRight ? 'w-80 border-l' : 'border-t'
    }`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-neutral-9">AI Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-2 text-neutral-6">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-neutral-3 px-2 gap-1">
        {TAB_ITEMS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(''); setError(''); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-neutral-6 hover:text-neutral-9'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}
