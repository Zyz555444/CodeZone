import { io, Socket } from 'socket.io-client';
import { useWebSocketStore } from '@/stores/websocketStore';
import { wsUrl } from '@/lib/env';

/**
 * WebSocket 连接服务（精简版）
 *
 * 仅负责 Socket.IO 连接生命周期管理。
 * 所有业务逻辑（团队、聊天、协作编辑、终端）已移至 React hooks。
 *
 * 唯一连接入口：Header 组件在用户登录后调用 connect()。
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 建立 Socket.IO 连接
   * 如果已连接或已有 socket 实例则不重复创建
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    // 如果 socket 已存在但尚未连接，不重复创建
    if (this.socket) {
      return;
    }

    this.socket = io(wsUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      useWebSocketStore.getState().setConnected(true);
    });

    this.socket.on('disconnect', (reason) => {
      useWebSocketStore.getState().setConnected(false);
    });

    this.socket.on('reconnect_failed', () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        if (this.socket?.connected) return;
        if (!this.socket) return;
        this.socket.connect();
      }, 60000);
    });
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    useWebSocketStore.getState().reset();
  }

  /** 获取 socket 实例（供 hooks 内部使用） */
  getSocket(): Socket | null {
    return this.socket;
  }

  /** 获取 socket 实例（向后兼容，用于 Header 组件等检查连接状态） */
  get socketInstance(): Socket | null {
    return this.socket;
  }
}

export const wsService = new WebSocketService();
