import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { wsService } from './index';
import { useWebSocketStore } from '@/stores/websocketStore';
import { EVENTS } from './events';
import type {
  ChatMessage,
  TeamOnlineData,
  NotificationData,
  ChatTypingData,
  ChatRoomUpdate,
  TerminalResizeData,
} from './types';

// ==================== useWebSocket ====================

/**
 * 获取 WebSocket 连接状态和 socket 实例
 */
export function useWebSocket() {
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const socket = wsService.getSocket();

  return { isConnected, socket };
}

// ==================== useTeam ====================

/**
 * 团队协作 hook
 * 管理团队加入/离开、在线用户列表、系统通知
 */
export function useTeam(teamId: string | null, onNotification?: (data: NotificationData) => void) {
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!isConnected || !teamId) return;
    const socket = wsService.getSocket();
    if (!socket) return;

    // 加入团队
    socket.emit(EVENTS.TEAM_JOIN, teamId);

    // 监听在线用户
    const handleOnline = (data: TeamOnlineData) => {
      setOnlineCount(data.count);
    };
    socket.on(EVENTS.TEAM_ONLINE, handleOnline);

    // 监听通知
    const handleNotification = (data: NotificationData) => {
      onNotification?.(data);
    };
    if (onNotification) {
      socket.on(EVENTS.NOTIFICATION, handleNotification);
    }

    return () => {
      socket.emit(EVENTS.TEAM_LEAVE, teamId);
      socket.off(EVENTS.TEAM_ONLINE, handleOnline);
      if (onNotification) {
        socket.off(EVENTS.NOTIFICATION, handleNotification);
      }
    };
  }, [isConnected, teamId, onNotification]);

  return { onlineCount };
}

// ==================== useChat ====================

/**
 * 聊天 hook
 * 管理聊天房间、消息收发、输入状态、历史加载
 */
export function useChat(roomId: string | null) {
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!isConnected || !roomId) return;
    const socket = wsService.getSocket();
    if (!socket) return;

    // 加入聊天房间
    socket.emit(EVENTS.CHAT_JOIN, roomId);

    // 历史消息
    const handleHistory = (data: { roomId: string; messages: ChatMessage[] }) => {
      if (data.roomId === roomId) {
        setMessages(data.messages);
      }
    };

    // 接收消息
    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    // 房间更新
    const handleRoomUpdate = (data: ChatRoomUpdate) => {
      if (data.roomId === roomId) {
        setOnlineUsers(data.users);
      }
    };

    // 输入状态
    const handleTypingStart = (data: ChatTypingData) => {
      setTypingUsers((prev) =>
        prev.includes(data.userId) ? prev : [...prev, data.userId]
      );
    };

    const handleTypingStop = (data: ChatTypingData) => {
      setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
    };

    socket.on(EVENTS.CHAT_HISTORY, handleHistory);
    socket.on(EVENTS.CHAT_MESSAGE_RECEIVE, handleMessage);
    socket.on(EVENTS.CHAT_ROOM_UPDATE, handleRoomUpdate);
    socket.on(EVENTS.CHAT_TYPING_START, handleTypingStart);
    socket.on(EVENTS.CHAT_TYPING_STOP, handleTypingStop);

    return () => {
      socket.emit(EVENTS.CHAT_LEAVE, roomId);
      socket.off(EVENTS.CHAT_HISTORY, handleHistory);
      socket.off(EVENTS.CHAT_MESSAGE_RECEIVE, handleMessage);
      socket.off(EVENTS.CHAT_ROOM_UPDATE, handleRoomUpdate);
      socket.off(EVENTS.CHAT_TYPING_START, handleTypingStart);
      socket.off(EVENTS.CHAT_TYPING_STOP, handleTypingStop);
    };
  }, [isConnected, roomId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!roomId) return;
      wsService.getSocket()?.emit(EVENTS.CHAT_MESSAGE_SEND, { roomId, content });
    },
    [roomId]
  );

  const sendTypingStart = useCallback(() => {
    if (!roomId) return;
    wsService.getSocket()?.emit(EVENTS.CHAT_TYPING_START, { roomId });
  }, [roomId]);

  const sendTypingStop = useCallback(() => {
    if (!roomId) return;
    wsService.getSocket()?.emit(EVENTS.CHAT_TYPING_STOP, { roomId });
  }, [roomId]);

  return { messages, typingUsers, onlineUsers, sendMessage, sendTypingStart, sendTypingStop };
}

// ==================== useYjs ====================

/**
 * Yjs 协作编辑 hook
 * 通过 y-socket.io 提供者同步 Yjs 文档
 * 注意：需要前端安装 y-socket.io 依赖
 */
export function useYjs(docId: string, userId: string, userName: string) {
  const ydocRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!docId || !userId) return;

    let cancelled = false;

    // 动态导入 Yjs 和 y-socket.io 以支持 SSR
    const initYjs = async () => {
      try {
        const Y = await import('yjs');
        const { SocketIOProvider } = await import('y-socket.io');

        const doc = new Y.Doc();
        const provider = new SocketIOProvider(
          wsService.getSocket()?.io.opts?.hostname || window.location.origin,
          docId,
          doc,
          {
            auth: { userId, userName },
            autoConnect: false,
          }
        );

        provider.on('sync', (isSynced: boolean) => {
          if (!cancelled) setSynced(isSynced);
        });

        // 连接到现有的 Socket.IO 实例
        provider.connect();

        if (!cancelled) {
          ydocRef.current = doc;
          providerRef.current = provider;
        }
      } catch (err) {
        console.error('[useYjs] Failed to initialize Yjs:', err);
      }
    };

    initYjs();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [docId, userId, userName]);

  return { ydoc: ydocRef, provider: providerRef, synced };
}

// ==================== useTerminal ====================

/**
 * 终端 hook
 * 通过 Socket.IO 事件桥接 node-pty 终端
 */
export function useTerminal(projectId: string) {
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const [initialized, setInitialized] = useState(false);

  // 初始化终端
  useEffect(() => {
    if (!isConnected || !projectId) return;
    const socket = wsService.getSocket();
    if (!socket) return;

    socket.emit(EVENTS.TERM_INIT, { projectId } as { projectId: string });
    setInitialized(true);
  }, [isConnected, projectId]);

  // 监听终端输出并写入 xterm 终端
  const bindOutput = useCallback(
    (write: (data: string) => void) => {
      const socket = wsService.getSocket();
      if (!socket) return () => {};

      const handler = (data: string) => write(data);
      socket.on(EVENTS.TERM_OUTPUT, handler);
      return () => {
        socket.off(EVENTS.TERM_OUTPUT, handler);
      };
    },
    []
  );

  // 发送输入到终端
  const sendInput = useCallback((data: string) => {
    wsService.getSocket()?.emit(EVENTS.TERM_INPUT, data);
  }, []);

  // 调整终端大小
  const sendResize = useCallback((cols: number, rows: number) => {
    wsService.getSocket()?.emit(EVENTS.TERM_RESIZE, { cols, rows } satisfies TerminalResizeData);
  }, []);

  return { initialized, bindOutput, sendInput, sendResize };
}
