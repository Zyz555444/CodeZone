import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:10101';
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] 正在连接...', this.url);

    this.socket = io(this.url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] 已连接');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] 连接错误:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] 已断开:', reason);
    });

    this.socket.on('error', (error: any) => {
      console.error('[WebSocket] 错误:', error);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinProject(projectId: string): void {
    this.socket?.emit('join-project', projectId);
  }

  leaveProject(projectId: string): void {
    this.socket?.emit('leave-project', projectId);
  }

  sendCodeChange(data: { projectId: string; fileId: string; content: string }): void {
    this.socket?.emit('code-change', data);
  }

  sendCursorMove(data: { projectId: string; fileId: string; position: any }): void {
    this.socket?.emit('cursor-move', data);
  }

  sendMessage(data: { projectId: string; content: string }): void {
    this.socket?.emit('send-message', data);
  }

  get socketInstance(): Socket | null {
    return this.socket;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  onOnlineUsers(callback: (data: any) => void): void {
    this.socket?.on('online-users', callback);
  }

  onCodeChange(callback: (data: any) => void): void {
    this.socket?.on('code-change', callback);
  }

  onCursorMove(callback: (data: any) => void): void {
    this.socket?.on('cursor-move', callback);
  }

  onReceiveMessage(callback: (data: any) => void): void {
    this.socket?.on('receive-message', callback);
  }

  offOnlineUsers(callback: (data: any) => void): void {
    this.socket?.off('online-users', callback);
  }

  offCodeChange(callback: (data: any) => void): void {
    this.socket?.off('code-change', callback);
  }

  offCursorMove(callback: (data: any) => void): void {
    this.socket?.off('cursor-move', callback);
  }

  offReceiveMessage(callback: (data: any) => void): void {
    this.socket?.off('receive-message', callback);
  }
}

export const wsService = new WebSocketService();
