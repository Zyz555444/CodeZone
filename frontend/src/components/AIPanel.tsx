'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import {
  Loader2, Send, Sparkles, X, Square, Plus, MessageSquare,
  Trash2, Copy, Check, Bot, FileText, Cpu, ToggleRight, ToggleLeft,
} from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import {
  streamChat, agentExecute, abortAgentExecute, confirmAgentTool, listConversations,
  getConversation, deleteConversation, type AIError,
} from '@/lib/ai';
import { AgentThinking } from './AgentThinking';
import { FilePatchPreview } from './FilePatchPreview';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useEditorCommandBus } from './EditorCommandBus';

interface AIAgentPanelProps {
  projectId: string;
  teamId?: string;
  onClose: () => void;
  position?: 'right' | 'bottom';
}

export function AIAgentPanel({ projectId, teamId, onClose, position = 'right' }: AIAgentPanelProps) {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    toolId: string;
    toolName: string;
    toolArgs: Record<string, unknown>;
    conversationId: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { emitCommand } = useEditorCommandBus();

  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamContent,
    contextFiles,
    isAgentMode,
    thinkingContent,
    toolCalls,
    filePatches,
    setConversations,
    setActiveConversation,
    removeConversation,
    setMessages,
    addMessage,
    setIsStreaming,
    appendStreamContent,
    resetStreamContent,
    setError,
    clearError,
    error,
    appendThinking,
    resetThinking,
    addToolCall,
    updateToolCall,
    addFilePatch,
    acceptFilePatch,
    rejectFilePatch,
    clearFilePatches,
    clearToolCalls,
    setIsAgentMode,
    setExecuting,
    toggleContextFile,
  } = useAIStore();

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamContent, thinkingContent, toolCalls]);

  useEffect(() => {
    if (projectId) loadConversations();
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const loadConversations = async () => {
    try {
      const data = await listConversations(projectId);
      setConversations(data.conversations || []);
    } catch {
      // silent
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    setShowHistory(false);
    try {
      const data = await getConversation(id);
      setMessages(data.conversation?.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const handleNewConversation = async () => {
    abortStream();
    resetStreamContent();
    resetThinking();
    setActiveConversation(null);
    setMessages([]);
    setShowHistory(false);
    clearError();
    setExecuting(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      removeConversation(id);
      if (activeConversationId === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch {
      // silent
    }
  };

  const abortStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setExecuting(false);
  };

  const handleToggleStep = (toolId: string) => {
    const step = toolCalls.find((t) => t.toolId === toolId);
    if (step) {
      updateToolCall(toolId, { collapsed: !step.collapsed });
    }
  };

  const handleConfirmTool = async (confirmed: boolean) => {
    if (!pendingConfirmation) return;
    const { toolId, conversationId } = pendingConfirmation;
    setPendingConfirmation(null);
    try {
      await confirmAgentTool(conversationId, toolId, confirmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败');
    }
  };

  const quickActions = [
    { label: '解释代码', prompt: '请解释当前项目/文件的主要逻辑' },
    { label: '生成测试', prompt: '为当前选中的代码生成单元测试' },
    { label: '查找 Bug', prompt: '检查当前代码中的潜在 Bug 并给出修复建议' },
    { label: '重构优化', prompt: '重构并优化当前代码，提升可读性与性能' },
  ];

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    clearError();
    resetThinking();
    setIsStreaming(true);
    setExecuting(true);

    if (isAgentMode) {
      resetStreamContent();

      const userMsgId = generateId();
      addMessage({
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      });

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        let convId: string | undefined;

        await agentExecute(
          {
            task: text,
            projectId,
            conversationId: activeConversationId || undefined,
            contextFiles: contextFiles.length > 0 ? contextFiles : undefined,
            teamId,
          },
          {
            onToken: (token) => {
              appendStreamContent(token);
            },
            onThinking: (content) => {
              appendThinking(content);
            },
            onToolCall: (toolId, toolName, toolArgs) => {
              addToolCall({
                id: toolId,
                toolId,
                toolName,
                toolArgs,
                status: 'running',
                collapsed: false,
              });
            },
            onToolResult: (toolId, toolName, result) => {
              updateToolCall(toolId, {
                status: result.startsWith('Error:') ? 'error' : 'completed',
                result,
                collapsed: true,
              });
            },
            onWriteFile: (filePath, content, patch) => {
              addFilePatch({
                filePath,
                newContent: content,
                oldContent: patch?.old,
                accepted: null,
              });
              emitCommand({
                type: 'diff',
                payload: {
                  filePath,
                  old: patch?.old ?? '',
                  new: content,
                },
              });
            },
            onConfirmRequest: (toolId, toolName, toolArgs, conversationId) => {
              setPendingConfirmation({
                toolId,
                toolName,
                toolArgs,
                conversationId: conversationId || activeConversationId || '',
              });
            },
            onDone: (conversationId) => {
              const finalContent = useAIStore.getState().streamContent;
              if (finalContent) {
                addMessage({
                  id: generateId(),
                  role: 'assistant',
                  content: finalContent,
                  createdAt: new Date().toISOString(),
                });
              }
              convId = conversationId || undefined;
              if (convId && !activeConversationId) {
                setActiveConversation(convId);
                loadConversations();
              } else if (activeConversationId) {
                loadConversations();
              }
              setIsStreaming(false);
              setExecuting(false);
              setPendingConfirmation(null);
              resetStreamContent();
              abortRef.current = null;
            },
            onError: (err: AIError) => {
              const prefixMap: Record<string, string> = {
                auth: '【认证失败】',
                rate_limit: '【请求过于频繁】',
                server: '【服务器错误】',
                timeout: '【请求超时】',
                network: '【网络错误】',
                abort: '',
              };
              const prefix = prefixMap[err.type] || '';
              const text = err.suggestion ? `${err.message}。${err.suggestion}` : err.message;
              setError(prefix ? `${prefix} ${text}` : text);
              setIsStreaming(false);
              setExecuting(false);
              setPendingConfirmation(null);
              resetStreamContent();
              abortRef.current = null;
            },
          },
          abortController.signal,
        );
      } catch {
        setIsStreaming(false);
        setExecuting(false);
        setPendingConfirmation(null);
        resetStreamContent();
        abortRef.current = null;
      }
    } else {
      resetStreamContent();

      const userMsg: { role: string; content: string } = { role: 'user', content: text };
      const displayMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        userMsg,
      ];
      addMessage({
        id: generateId(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      });

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        await streamChat(
          {
            conversationId: activeConversationId || undefined,
            projectId,
            messages: displayMessages as { role: string; content: string }[],
            contextFiles: contextFiles.length > 0 ? contextFiles : undefined,
            teamId,
          },
          {
            onToken: (token) => appendStreamContent(token),
            onDone: async (convId) => {
              const finalContent = useAIStore.getState().streamContent;
              addMessage({
                id: generateId(),
                role: 'assistant',
                content: finalContent,
                createdAt: new Date().toISOString(),
              });
              resetStreamContent();

              if (convId && !activeConversationId) {
                setActiveConversation(convId);
                loadConversations();
              } else if (activeConversationId) {
                loadConversations();
              }
              setIsStreaming(false);
              setExecuting(false);
              abortRef.current = null;
            },
            onError: (err: AIError) => {
              const prefixMap: Record<string, string> = {
                auth: '【认证失败】',
                rate_limit: '【请求过于频繁】',
                server: '【服务器错误】',
                timeout: '【请求超时】',
                network: '【网络错误】',
                abort: '',
              };
              const prefix = prefixMap[err.type] || '';
              const text = err.suggestion ? `${err.message}。${err.suggestion}` : err.message;
              setError(prefix ? `${prefix} ${text}` : text);
              setIsStreaming(false);
              setExecuting(false);
              abortRef.current = null;
            },
          },
          abortController.signal,
        );
      } catch {
        setIsStreaming(false);
        setExecuting(false);
        abortRef.current = null;
      }
    }
  };

  const handleStop = () => {
    abortStream();
    if (activeConversationId) {
      abortAgentExecute(activeConversationId).catch(() => {});
    }
    setPendingConfirmation(null);
    const finalContent = useAIStore.getState().streamContent;
    if (finalContent) {
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: finalContent,
        createdAt: new Date().toISOString(),
      });
    }
    resetStreamContent();
    resetThinking();
    clearToolCalls();
    clearFilePatches();
  };

  const handleCopy = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMap((prev) => ({ ...prev, [msgId]: true }));
      setTimeout(() => {
        setCopiedMap((prev) => ({ ...prev, [msgId]: false }));
      }, 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const isRight = position === 'right';

  return (
    <div className={`bg-neutral-1 border-neutral-3 flex flex-col ${
      isRight ? 'w-96 border-l' : 'border-t'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 rounded-lg hover:bg-neutral-2 text-neutral-6"
            title="对话历史"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <span className="text-copy-13 font-medium text-neutral-9">AI Agent</span>
          <button
            onClick={() => {
              setIsAgentMode(!isAgentMode);
              resetThinking();
              clearToolCalls();
              clearFilePatches();
            }}
            className={`p-1 rounded-lg transition-colors ${isAgentMode ? 'bg-accent/10 text-accent' : 'text-neutral-6 hover:bg-neutral-2'}`}
            title={isAgentMode ? '工具型 Agent 模式' : '对话模式'}
          >
            {isAgentMode ? <Cpu className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </button>
          {isAgentMode && (
            <span className="text-label-12 text-accent font-medium">工具模式</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewConversation}
            className="p-1 rounded-lg hover:bg-neutral-2 text-neutral-6"
            title="新对话"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-2 text-neutral-6">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="border-b border-neutral-3 max-h-48 overflow-y-auto shrink-0">
          <div className="p-2">
            <p className="text-label-12 text-neutral-6 px-2 py-1">对话历史</p>
            {conversations.length === 0 && (
              <p className="text-label-12 text-neutral-6 px-2 py-2">暂无对话</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-copy-13 group ${
                  activeConversationId === conv.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-neutral-8 hover:bg-neutral-2'
                }`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-3 text-neutral-6"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-error/10 border border-error/30 rounded-lg text-label-12 text-error shrink-0">
          {error}
          <button onClick={clearError} className="ml-2 underline">关闭</button>
        </div>
      )}

      {/* Messages area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center text-neutral-6 text-copy-13 py-8">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-accent/60" />
            <p className="font-medium">AI Coding Agent</p>
            <p className="text-label-12 mt-1">
              {isAgentMode
                ? '工具型 Agent 模式：AI 可读取文件、搜索代码、修改代码'
                : '对话模式：与 AI 对话辅助编程'}
            </p>
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setIsAgentMode(!isAgentMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-label-12 rounded-lg transition-colors ${
                  isAgentMode ? 'bg-accent/10 text-accent' : 'bg-neutral-2 text-neutral-7 hover:bg-neutral-3'
                }`}
              >
                {isAgentMode ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {isAgentMode ? '工具模式已启用' : '切换到工具模式'}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.prompt);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 text-label-12 rounded-lg bg-neutral-2 text-neutral-7 hover:bg-neutral-3 hover:text-neutral-9 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-copy-13 ${
              msg.role === 'user'
                ? 'bg-accent text-white'
                : 'bg-neutral-2 text-neutral-9'
            }`}>
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
              {msg.role === 'assistant' && msg.content && (
                <div className="flex gap-1 mt-1.5 pt-1 border-t border-neutral-3/50">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 rounded hover:bg-neutral-3 text-neutral-6 text-label-12 flex items-center gap-1"
                  >
                    {copiedMap[msg.id] ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Agent thinking + tools during streaming */}
        {isAgentMode && (thinkingContent || toolCalls.length > 0) && (
          <AgentThinking
            thinkingContent={thinkingContent}
            toolCalls={toolCalls}
            onToggleStep={handleToggleStep}
            onAcceptFilePatch={acceptFilePatch}
            onRejectFilePatch={rejectFilePatch}
            filePatches={filePatches}
          />
        )}

        {/* Pending tool confirmation */}
        {pendingConfirmation && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl px-3 py-2 text-copy-13 bg-warning/10 border border-warning/30 text-warning">
              <div className="font-medium mb-1">
                AI 请求执行工具：{pendingConfirmation.toolName}
              </div>
              {typeof pendingConfirmation.toolArgs.filePath === 'string' && pendingConfirmation.toolArgs.filePath && (
                <div className="text-label-12 text-warning mb-2">
                  目标文件：{pendingConfirmation.toolArgs.filePath}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleConfirmTool(true)}
                  className="px-3 py-1 text-label-12 rounded-lg bg-warning text-white hover:bg-warning/80"
                >
                  允许执行
                </button>
                <button
                  onClick={() => handleConfirmTool(false)}
                  className="px-3 py-1 text-label-12 rounded-lg bg-neutral-1 border border-warning/30 text-warning hover:bg-warning/10"
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File patch preview */}
        <FilePatchPreview
          patches={filePatches}
          onAccept={acceptFilePatch}
          onReject={rejectFilePatch}
        />

        {/* Streaming text content */}
        {isStreaming && streamContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-copy-13 bg-neutral-2 text-neutral-9">
              <div className="prose prose-sm max-w-none prose-neutral whitespace-pre-wrap break-words leading-relaxed">
                {streamContent}
                <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {isStreaming && !streamContent && toolCalls.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-neutral-2 rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </div>
          </div>
        )}
      </div>

      {/* Context files bar */}
      {contextFiles.length > 0 && (
        <div className="px-3 py-1.5 border-t border-neutral-3 flex items-center gap-1.5 flex-wrap shrink-0">
          <FileText className="h-3 w-3 text-neutral-6" />
          {contextFiles.map((fid) => (
            <button
              key={fid}
              onClick={() => toggleContextFile(fid)}
              className="inline-flex items-center gap-1 text-label-12 bg-accent/10 text-accent px-1.5 py-0.5 rounded hover:bg-accent/20"
              title="点击移除"
            >
              {fid.slice(0, 12)}...
              <X className="h-3 w-3" />
            </button>
          ))}
          <span className="text-label-12 text-neutral-6 ml-auto">
            {contextFiles.length} 个上下文文件
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-neutral-3 p-3 shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setInput(action.prompt);
                inputRef.current?.focus();
              }}
              disabled={isStreaming}
              className="px-2 py-0.5 text-label-12 rounded-md bg-neutral-2 text-neutral-6 hover:bg-neutral-3 hover:text-neutral-9 transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isStreaming ? 'AI 正在生成...' : isAgentMode ? '描述编程任务，AI 将自动调用工具完成...' : '描述你的需求...'}
            disabled={isStreaming}
            className="flex-1 bg-neutral-2 border border-neutral-3 rounded-lg px-3 py-2 text-copy-13 text-neutral-9 placeholder-neutral-6 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />
          {isStreaming ? (
            <Button onClick={handleStop} size="sm" className="px-3 bg-error hover:bg-error/80">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={!input.trim()} size="sm" className="px-3">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
