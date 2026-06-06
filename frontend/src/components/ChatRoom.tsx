'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { wsService } from '@/lib/websocket';
import { Send, Users, Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

interface ChatRoomProps {
  roomId: string;
  roomName?: string;
  projectId?: string;
}

export function ChatRoom({ roomId, roomName, projectId }: ChatRoomProps) {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    wsService.connect(token);
    wsService.joinProject(roomId);

    wsService.onReceiveMessage((data) => {
      setMessages((prev) => [...prev, {
        ...data,
        timestamp: new Date(data.timestamp),
      }]);
    });

    wsService.onOnlineUsers((data) => {
      setOnlineUsers(data.users || []);
    });

    return () => {
      wsService.leaveProject(roomId);
      wsService.offReceiveMessage(() => {});
      wsService.offOnlineUsers(() => {});
    };
  }, [roomId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    wsService.sendMessage({
      projectId: roomId,
      content: inputMessage,
    });

    setInputMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{roomName || `项目聊天`}</h3>
          <p className="text-xs text-muted-foreground">
            {onlineUsers.length} 人在线
          </p>
        </div>
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((userId) => (
            <div
              key={userId}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-background"
              title={userId}
            >
              <span className="text-xs font-medium text-primary">
                {userId.slice(0, 2).toUpperCase()}
              </span>
            </div>
          ))}
          {onlineUsers.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
              <span className="text-xs font-medium text-muted-foreground">
                +{onlineUsers.length - 5}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无消息，开始第一次聊天吧
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.userId === user?.id ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.userId === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.userId === 'system' ? (
                  '🤖'
                ) : (
                  <span className="text-xs font-medium">
                    {message.userName[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'max-w-[70%] space-y-1',
                  message.userId === user?.id ? 'items-end' : ''
                )}
              >
                {message.type !== 'system' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {message.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm',
                    message.type === 'system'
                      ? 'bg-muted text-muted-foreground text-center'
                      : message.userId === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
