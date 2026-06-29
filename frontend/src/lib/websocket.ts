import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || '/socket.io';
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    // 如果 socket 已存在但尚未连接，不要重复创建，避免覆盖已有的监听器
    if (this.socket) {
      return;
    }

    this.socket = io(this.url, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.warn('[WebSocket] 已连接');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] 连接错误:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[WebSocket] 已断开:', reason);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.warn(`[WebSocket] 重连尝试 ${attempt}/5...`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[WebSocket] 重连失败:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] 重连耗尽，60秒后发起新一轮重连...');

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        if (this.socket?.connected) {
          console.warn('[WebSocket] 已恢复连接，跳过手动重连');
          return;
        }
        if (!this.socket) return;
        console.warn('[WebSocket] 手动发起新一轮重连...');
        this.socket.connect();
      }, 60000);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  // 通用事件监听 — 回调通过 Socket.IO 转发，参数类型由具体事件定义
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  // 团队相关
  joinTeam(teamId: string): void {
    this.socket?.emit('join-team', teamId);
  }

  leaveTeam(teamId: string): void {
    this.socket?.emit('leave-team', teamId);
  }

  // 聊天房间
  joinRoom(roomId: string): void {
    this.socket?.emit('join-room', roomId);
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('leave-room', roomId);
  }

  // 发送消息
  sendMessage(data: { roomId: string; content: string }): void {
    this.socket?.emit('send-message', data);
  }

  // 输入状态
  sendTypingStart(roomId: string): void {
    this.socket?.emit('typing-start', { roomId });
  }

  sendTypingStop(roomId: string): void {
    this.socket?.emit('typing-stop', { roomId });
  }

  // 聊天事件监听
  onRoomHistory(callback: (data: any) => void): void {
    this.socket?.on('room-history', callback);
  }

  offRoomHistory(callback: (data: any) => void): void {
    this.socket?.off('room-history', callback);
  }

  onRoomUpdate(callback: (data: any) => void): void {
    this.socket?.on('room-update', callback);
  }

  offRoomUpdate(callback: (data: any) => void): void {
    this.socket?.off('room-update', callback);
  }

  onReceiveMessage(callback: (data: any) => void): void {
    this.socket?.on('receive-message', callback);
  }

  offReceiveMessage(callback: (data: any) => void): void {
    this.socket?.off('receive-message', callback);
  }

  onUserTyping(callback: (data: any) => void): void {
    this.socket?.on('user-typing', callback);
  }

  offUserTyping(callback: (data: any) => void): void {
    this.socket?.off('user-typing', callback);
  }

  onUserStopTyping(callback: (data: any) => void): void {
    this.socket?.on('user-stop-typing', callback);
  }

  offUserStopTyping(callback: (data: any) => void): void {
    this.socket?.off('user-stop-typing', callback);
  }

  // 协作编辑
  sendCodeChange(data: { projectId: string; fileId: string; content: string }): void {
    this.socket?.emit('code-change', data);
  }

  sendCursorMove(data: { projectId: string; fileId: string; position: any }): void {
    this.socket?.emit('cursor-move', data);
  }

  onOnlineUsers(callback: (data: any) => void): void {
    this.socket?.on('online-users', callback);
  }

  offOnlineUsers(callback: (data: any) => void): void {
    this.socket?.off('online-users', callback);
  }

  onCodeChange(callback: (data: any) => void): void {
    this.socket?.on('code-change', callback);
  }

  offCodeChange(callback: (data: any) => void): void {
    this.socket?.off('code-change', callback);
  }

  onCursorMove(callback: (data: any) => void): void {
    this.socket?.on('cursor-move', callback);
  }

  offCursorMove(callback: (data: any) => void): void {
    this.socket?.off('cursor-move', callback);
  }

  // 实时通知
  onNotification(callback: (data: any) => void): void {
    this.socket?.on('notification', callback);
  }

  offNotification(callback: (data: any) => void): void {
    this.socket?.off('notification', callback);
  }

  get socketInstance(): Socket | null {
    return this.socket;
  }
}

export const wsService = new WebSocketService();
