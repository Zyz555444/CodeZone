import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  projectId?: string;
}

export class WebSocketHandler {
  private io: Server;
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket 服务已初始化');
  }

  private authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;
      
      if (!token) {
        return next(new Error('认证 token 缺失'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`用户 ${socket.userId} 已连接 WebSocket`);

    // 加入房间
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      socket.projectId = projectId;
      this.trackUser(socket.userId!, projectId);
      this.broadcastOnlineUsers(projectId);
      logger.info(`用户 ${socket.userId} 加入项目 ${projectId}`);
    });

    // 离开房间
    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      this.untrackUser(socket.userId!, projectId);
      this.broadcastOnlineUsers(projectId);
    });

    // 代码协作事件
    socket.on('code-change', (data: { projectId: string; fileId: string; content: string }) => {
      socket.to(`project:${data.projectId}`).emit('code-change', data);
    });

    // 协作光标
    socket.on('cursor-move', (data: { projectId: string; fileId: string; position: any }) => {
      socket.to(`project:${data.projectId}`).emit('cursor-move', {
        userId: socket.userId,
        ...data,
      });
    });

    // 聊天消息
    socket.on('send-message', (data: { projectId: string; content: string }) => {
      this.io.to(`project:${data.projectId}`).emit('receive-message', {
        userId: socket.userId,
        content: data.content,
        timestamp: new Date(),
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      if (socket.projectId) {
        this.untrackUser(socket.userId!, socket.projectId);
        this.broadcastOnlineUsers(socket.projectId);
      }
      logger.info(`用户 ${socket.userId} 断开 WebSocket 连接`);
    });
  }

  private trackUser(userId: string, projectId: string): void {
    const key = `${projectId}:${userId}`;
    if (!this.connectedUsers.has(projectId)) {
      this.connectedUsers.set(projectId, new Set());
    }
    this.connectedUsers.get(projectId)!.add(userId);
  }

  private untrackUser(userId: string, projectId: string): void {
    const projectUsers = this.connectedUsers.get(projectId);
    if (projectUsers) {
      projectUsers.delete(userId);
      if (projectUsers.size === 0) {
        this.connectedUsers.delete(projectId);
      }
    }
  }

  private broadcastOnlineUsers(projectId: string): void {
    const users = Array.from(this.connectedUsers.get(projectId) || []);
    this.io.to(`project:${projectId}`).emit('online-users', { users });
  }

  // 发送通知
  sendNotification(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('notification', data);
  }

  // 广播到项目
  broadcastToProject(projectId: string, event: string, data: any): void {
    this.io.to(`project:${projectId}`).emit(event, data);
  }
}
