'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { wsService } from '@/lib/websocket';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

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
  const token = useAuthStore((s) => s.token);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingClearTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isTypingRef = useRef(false);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!token || !roomId) return;

    wsService.connect(token);

    const onConnect = () => {
      setConnected(true);
      wsService.joinRoom(roomId);
    };

    const onDisconnect = () => setConnected(false);

    wsService.on('connect', onConnect);
    wsService.on('disconnect', onDisconnect);

    if (wsService.socketInstance?.connected) {
      setConnected(true);
      wsService.joinRoom(roomId);
    }

    return () => {
      wsService.leaveRoom(roomId);
      wsService.off('connect', onConnect);
      wsService.off('disconnect', onDisconnect);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [roomId, token]);

  useEffect(() => {
    if (!roomId) return;

    const handleRoomHistory = (data: { roomId: string; messages: ChatMessage[] }) => {
      if (data.roomId !== roomId) return;
      setMessages(data.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })));
      setLoadingHistory(false);
    };

    const handleRoomUpdate = (data: { roomId: string; users: string[]; count: number }) => {
      if (data.roomId !== roomId) return;
      setOnlineUsers(data.users || []);
      setOnlineCount(data.count || 0);
    };

    const handleReceiveMessage = (data: ChatMessage) => {
      if (messageIdsRef.current.has(data.id)) return;
      messageIdsRef.current.add(data.id);
      setMessages((prev) => [...prev, {
        ...data,
        timestamp: new Date(data.timestamp),
      }]);
    };

    const handleUserTyping = (data: { userId: string; userName: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.userName }));
      const existing = typingClearTimersRef.current.get(data.userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
        typingClearTimersRef.current.delete(data.userId);
      }, 3000);
      typingClearTimersRef.current.set(data.userId, timer);
    };

    const handleUserStopTyping = (data: { userId: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    };

    wsService.onRoomHistory(handleRoomHistory);
    wsService.onRoomUpdate(handleRoomUpdate);
    wsService.onReceiveMessage(handleReceiveMessage);
    wsService.onUserTyping(handleUserTyping);
    wsService.onUserStopTyping(handleUserStopTyping);

    return () => {
      wsService.offRoomHistory(handleRoomHistory);
      wsService.offRoomUpdate(handleRoomUpdate);
      wsService.offReceiveMessage(handleReceiveMessage);
      wsService.offUserTyping(handleUserTyping);
      wsService.offUserStopTyping(handleUserStopTyping);
      typingClearTimersRef.current.forEach((timer) => clearTimeout(timer));
      typingClearTimersRef.current.clear();
      messageIdsRef.current.clear();
    };
  }, [roomId]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      prevMessageCountRef.current = messages.length;
    }
  }, [messages]);

  const shouldShowHeader = useCallback((message: ChatMessage, index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (message.type === 'SYSTEM') return true;
    return prev.userId !== message.userId || prev.type === 'SYSTEM';
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    wsService.sendMessage({
      roomId,
      content: inputMessage,
    });

    if (isTypingRef.current) {
      wsService.sendTypingStop(roomId);
      isTypingRef.current = false;
    }

    setInputMessage('');
  }, [inputMessage, roomId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    if (value && !isTypingRef.current) {
      isTypingRef.current = true;
      wsService.sendTypingStart(roomId);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (value) {
      typingTimerRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          wsService.sendTypingStop(roomId);
          isTypingRef.current = false;
        }
      }, 3000);
    } else {
      if (isTypingRef.current) {
        wsService.sendTypingStop(roomId);
        isTypingRef.current = false;
      }
    }
  }, [roomId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

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
          {!connected && (
            <span className="flex items-center gap-1.5 text-label-12 text-amber-6">
              <Loader2 className="h-3 w-3 animate-spin" />
              连接中...
            </span>
          )}
          <div className="flex -space-x-1.5">
            {onlineUsers.slice(0, 5).map((uid) => (
              <div
                key={uid}
                className="w-7 h-7 rounded-full border-2 border-neutral-1 flex items-center justify-center text-caption-10 font-medium"
                title={uid}
              >
                <span className={cn('w-full h-full rounded-full flex items-center justify-center', getAvatarColor(uid))}>
                  {uid.slice(0, 1).toUpperCase()}
                </span>
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-neutral-3 border-2 border-neutral-1 flex items-center justify-center">
                <span className="text-caption-10 font-medium text-neutral-7">
                  +{onlineUsers.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-7" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-7">
            <div className="text-display-36 opacity-20">&#x1F4AC;</div>
            <p className="text-copy-13">暂无消息，发送第一条消息开始交流</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isMine={message.userId === user?.id}
              showHeader={shouldShowHeader(message, index)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingIndicatorText && (
        <div className="px-4 py-1">
          <p className="text-label-12 text-neutral-6 animate-pulse">{typingIndicatorText}</p>
        </div>
      )}

      <div className="px-4 py-3 border-t border-neutral-4 bg-neutral-2/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            className="flex-1 h-9 px-3 rounded-lg bg-neutral-1 border border-neutral-4 text-copy-13 text-neutral-9 placeholder:text-neutral-7 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="h-9 w-9 rounded-lg"
            disabled={!inputMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
