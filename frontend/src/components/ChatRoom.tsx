'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocketStore } from '@/stores/websocketStore';
import { useChat } from '@/lib/websocket/hooks';
import type { ChatMessage } from '@/lib/websocket/types';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ChatRoomProps {
  roomId: string;
  roomName?: string;
}

const AVATAR_COLORS = [
  'bg-rose-100 text-rose-600',
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-violet-100 text-violet-600',
  'bg-cyan-100 text-cyan-600',
];

function getAvatarColor(userName: string): string {
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    hash = userName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isMine: boolean;
  showHeader: boolean;
}

const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  isMine,
  showHeader,
}: ChatMessageItemProps) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-1.5">
        <span className="text-label-12 text-neutral-6 bg-neutral-2 px-3 py-0.5 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 group',
        isMine ? 'flex-row-reverse' : '',
        showHeader ? 'mt-3 first:mt-0' : ''
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-label-12 font-medium',
            getAvatarColor(message.userName),
          )}
          title={message.userName}
        >
          {message.userName.charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={cn('flex flex-col max-w-[70%]', isMine ? 'items-end' : '')}>
        {showHeader && (
          <div className={cn('flex items-center gap-2 mb-0.5', isMine ? 'flex-row-reverse' : '')}>
            <span className="text-label-12 font-medium text-neutral-7">{message.userName}</span>
            <span className="text-caption-10 text-neutral-7">{formatTime(message.timestamp)}</span>
          </div>
        )}
        <div
          className={cn(
            'px-3 py-1.5 text-copy-13 leading-relaxed break-words',
            isMine
              ? 'bg-accent-subtle text-accent rounded-2xl rounded-tr-md'
              : 'bg-neutral-2 text-neutral-9 rounded-2xl rounded-tl-md',
            !showHeader && isMine && 'rounded-tr-2xl',
            !showHeader && !isMine && 'rounded-tl-2xl',
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
});

export function ChatRoom({ roomId, roomName = '聊天室' }: ChatRoomProps) {
  const user = useAuthStore((s) => s.user);
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const prevMessageCountRef = useRef(0);

  // 使用 useChat hook 管理所有 WebSocket 聊天逻辑
  const {
    messages: rawMessages,
    typingUsers: rawTypingUsers,
    onlineUsers: rawOnlineUsers,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
  } = useChat(roomId);

  // 转换消息时间戳
  const messages = React.useMemo(
    () =>
      rawMessages
        .filter((m) => {
          if (messageIdsRef.current.has(m.id)) return false;
          messageIdsRef.current.add(m.id);
          return true;
        })
        .map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
    [rawMessages]
  );

  // 追踪历史加载完成
  useEffect(() => {
    if (rawMessages.length > 0) {
      setLoadingHistory(false);
    }
  }, [rawMessages.length]);

  // 自动滚动到底部
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      prevMessageCountRef.current = messages.length;
    }
  }, [messages]);

  const onlineCount = rawOnlineUsers.length;
  // typingUsers 是 string[]（userId 数组），保持向后兼容的 Record<string, string> 格式
  const typingUsers = React.useMemo(() => {
    const map: Record<string, string> = {};
    rawTypingUsers.forEach((uid) => {
      map[uid] = '用户';
    });
    return map;
  }, [rawTypingUsers]);

  const shouldShowHeader = useCallback(
    (message: ChatMessage, index: number) => {
      if (index === 0) return true;
      const prev = messages[index - 1];
      if (message.type === 'SYSTEM') return true;
      return prev.userId !== message.userId || prev.type === 'SYSTEM';
    },
    [messages]
  );

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    sendMessage(inputMessage);

    if (isTypingRef.current) {
      sendTypingStop();
      isTypingRef.current = false;
    }

    setInputMessage('');
  }, [inputMessage, sendMessage, sendTypingStop]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputMessage(value);

      if (value && !isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingStart();
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      if (value) {
        typingTimerRef.current = setTimeout(() => {
          if (isTypingRef.current) {
            sendTypingStop();
            isTypingRef.current = false;
          }
        }, 3000);
      } else {
        if (isTypingRef.current) {
          sendTypingStop();
          isTypingRef.current = false;
        }
      }
    },
    [sendTypingStart, sendTypingStop]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const typingIndicatorText = useMemo(() => {
    const others = Object.entries(typingUsers).filter(([uid]) => uid !== user?.id);
    if (others.length === 0) return null;
    return `${others.map(([, name]) => name).join('、')} 正在输入...`;
  }, [typingUsers, user?.id]);

  return (
    <div className="flex flex-col h-full border border-neutral-5 rounded-lg bg-neutral-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-4 bg-neutral-2/50">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-copy-13 font-medium text-neutral-9">{roomName}</h3>
            <p className="text-label-12 text-neutral-7">
              {onlineCount > 0 ? `${onlineCount} 人在线` : '暂无在线用户'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="flex items-center gap-1.5 text-label-12 text-amber-6">
              重连中...
            </span>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-6" />
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.userId === user?.id;
            return (
              <ChatMessageItem
                key={message.id}
                message={message}
                isMine={isMine}
                showHeader={
                  shouldShowHeader(message, index) || message.type === 'SYSTEM' ? true : shouldShowHeader(message, index)
                }
              />
            );
          })
        )}
        {typingIndicatorText && (
          <div className="flex items-center gap-2 py-1.5 text-label-12 text-neutral-7">
            {typingIndicatorText}
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-neutral-6 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-neutral-6 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 bg-neutral-6 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-neutral-4 bg-neutral-2/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 text-copy-13 bg-neutral-1 border border-neutral-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:text-neutral-7"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
            className="h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
