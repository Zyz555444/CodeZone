import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-not-for-production';

export class ChatWebSocketHandler {
  private io: Server;
  private rooms: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('聊天 WebSocket 服务已初始化');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    // 同步验证 JWT，立即注册事件处理器
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;

      if (!token) {
        logger.warn('聊天 WebSocket 认证失败: 缺少 token');
        socket.disconnect(true);
        return;
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      socket.userName = '加载中...';
    } catch (error) {
      logger.warn('聊天 WebSocket 认证失败', { error });
      socket.disconnect(true);
      return;
    }

    // 异步获取真实用户名
    prisma.user.findUnique({
      where: { id: socket.userId! },
      select: { username: true },
    }).then((dbUser) => {
      socket.userName = dbUser?.username || socket.userId!.slice(0, 8);
    }).catch(() => {
      socket.userName = socket.userId!.slice(0, 8);
    });

    socket.join(`user:${socket.userId}`);
    logger.info(`用户 ${socket.userName} (${socket.userId}) 已连接聊天`);

    // 加入聊天房间
    socket.on('join-room', async (roomId: string) => {
      try {
        if (!roomId || !socket.userId) return;

        socket.join(`room:${roomId}`);
        this.trackRoomUser(roomId, socket.userId);

        const users = Array.from(this.rooms.get(roomId) || []);
        this.io.to(`room:${roomId}`).emit('room-update', {
          roomId,
          users,
          count: users.length,
        });

        // 从数据库加载最近 50 条历史消息
        const historyRecords = await prisma.chatMessage.findMany({
          where: { roomId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
        const history: ChatMessage[] = historyRecords.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          content: m.content,
          timestamp: m.createdAt,
          type: m.type as 'text' | 'system',
        }));
        socket.emit('room-history', { roomId, messages: history });

        // 广播加入消息
        const joinMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: 'system',
          userName: '系统',
          content: `${socket.userName} 加入了房间`,
          timestamp: new Date(),
          type: 'system',
        };
        this.io.to(`room:${roomId}`).emit('receive-message', joinMsg);

        logger.info(`用户 ${socket.userName} 加入房间 ${roomId}`);
      } catch (error) {
        logger.error('加入房间失败', { error, userId: socket.userId, roomId });
      }
    });

    // 离开聊天房间
    socket.on('leave-room', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      this.handleLeaveRoom(roomId, socket.userId!, socket.userName || '未知用户');
    });

    // 发送消息
    socket.on('send-message', async (data: { roomId: string; content: string }) => {
      if (!data.roomId || !data.content?.trim() || !socket.userId) return;

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: socket.userId,
        userName: socket.userName || socket.userId.slice(0, 8),
        content: data.content.trim(),
        timestamp: new Date(),
        type: 'text',
      };

      // 持久化到数据库（异步，不阻塞广播）
      prisma.chatMessage.create({
        data: {
          id: message.id,
          roomId: data.roomId,
          userId: socket.userId,
          userName: message.userName,
          content: data.content.trim(),
          type: 'text',
        },
      }).catch((error) => {
        logger.error('保存消息失败', { error });
      });

      this.io.to(`room:${data.roomId}`).emit('receive-message', message);
    });

    // 输入状态
    socket.on('typing-start', (data: { roomId: string }) => {
      if (!data.roomId || !socket.userId) return;
      socket.to(`room:${data.roomId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        roomId: data.roomId,
      });
    });

    socket.on('typing-stop', (data: { roomId: string }) => {
      if (!data.roomId || !socket.userId) return;
      socket.to(`room:${data.roomId}`).emit('user-stop-typing', {
        userId: socket.userId,
        roomId: data.roomId,
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      if (!socket.userId) return;
      logger.info(`用户 ${socket.userName} 断开聊天连接`);

      this.rooms.forEach((users, roomId) => {
        if (users.has(socket.userId!)) {
          this.handleLeaveRoom(roomId, socket.userId!, socket.userName || '未知用户');
        }
      });
    });
  }

  private handleLeaveRoom(roomId: string, userId: string, userName: string): void {
    const users = this.rooms.get(roomId);
    if (!users) return;

    users.delete(userId);

    const leaveMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'system',
      userName: '系统',
      content: `${userName} 离开了房间`,
      timestamp: new Date(),
      type: 'system',
    };
    this.io.to(`room:${roomId}`).emit('receive-message', leaveMsg);

    const remaining = Array.from(users);
    this.io.to(`room:${roomId}`).emit('room-update', {
      roomId,
      users: remaining,
      count: remaining.length,
    });

    if (users.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  private trackRoomUser(roomId: string, userId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);
  }

  // 发送通知给指定用户
  sendNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}
