import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  teamId?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

export class ChatWebSocketHandler {
  private io: Server;
  private rooms: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // WebSocketHandler 中间件已完成 JWT 认证，此处直接使用 userId
      if (!socket.userId) {
        logger.warn('聊天 WebSocket: 未认证的连接被拒绝');
        socket.disconnect(true);
        return;
      }

      this.handleConnection(socket);
    });

    logger.info('聊天 WebSocket 服务已初始化');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    // 使用 userId 前缀作为初始名称，异步更新为真实用户名
    socket.userName = socket.userId!.slice(0, 8);

    // 异步获取真实用户名（失败不影响功能）
    prisma.user.findUnique({
      where: { id: socket.userId! },
      select: { username: true },
    }).then((dbUser: any) => {
      if (dbUser?.username) {
        socket.userName = dbUser.username;
      }
    }).catch(() => {});

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

        // 从数据库加载最近 50 条消息（desc 取最新，再反转）
        const historyRecords = await prisma.chatMessage.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        const history: ChatMessage[] = historyRecords.reverse().map((m: any) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          content: m.content,
          timestamp: m.createdAt,
          type: m.type as 'TEXT' | 'SYSTEM',
        }));
        socket.emit('room-history', { roomId, messages: history });

        // 广播加入消息（系统消息不存数据库）
        const joinMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: 'system',
          userName: '系统',
          content: `${socket.userName} 加入了房间`,
          timestamp: new Date(),
          type: 'SYSTEM',
        };
        this.io.to(`room:${roomId}`).emit('receive-message', joinMsg);

        logger.info(`用户 ${socket.userName} 加入房间 ${roomId}`);
      } catch (error) {
        logger.error('加入房间失败', { error, userId: socket.userId, roomId });
      }
    });

    // 离开聊天房间
    socket.on('leave-room', (roomId: string) => {
      if (!roomId || !socket.userId) return;
      socket.leave(`room:${roomId}`);
      this.handleLeaveRoom(roomId, socket.userId, socket.userName || '未知用户');
    });

    // 发送消息
    socket.on('send-message', async (data: { roomId: string; content: string }) => {
      if (!data.roomId || !data.content?.trim() || !socket.userId) return;

      const userName = socket.userName || socket.userId.slice(0, 8);
      const message: ChatMessage = {
        id: '', // 由 Prisma 自动生成 cuid()
        userId: socket.userId,
        userName,
        content: data.content.trim(),
        timestamp: new Date(),
        type: 'TEXT',
      };

      // 持久化到数据库并获取真实 ID
      try {
        const saved = await prisma.chatMessage.create({
          data: {
            roomId: data.roomId,
            userId: socket.userId,
            userName,
            content: data.content.trim(),
            type: 'TEXT',
          },
        });
        message.id = saved.id;
      } catch (error) {
        logger.error('保存消息失败', { error });
        // 使用临时 ID 继续广播
        message.id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }

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

      // 收集要处理的房间，避免遍历时修改 Map
      const roomsToLeave: string[] = [];
      this.rooms.forEach((users, roomId) => {
        if (users.has(socket.userId!)) {
          roomsToLeave.push(roomId);
        }
      });

      for (const roomId of roomsToLeave) {
        this.handleLeaveRoom(roomId, socket.userId!, socket.userName || '未知用户');
      }
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
      type: 'SYSTEM',
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

  sendNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}
