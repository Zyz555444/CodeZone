import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { getRedisClient, isRedisConnected } from '../lib/redis';

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

const ROOM_ONLINE_PREFIX = 'online:room:';
const USER_ROOMS_PREFIX = 'user:rooms:';

export class ChatWebSocketHandler {
  private io: Server;

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
        await this.trackRoomUser(roomId, socket.userId);

        const users = await this.getRoomUsers(roomId);
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
    socket.on('leave-room', async (roomId: string) => {
      if (!roomId || !socket.userId) return;
      socket.leave(`room:${roomId}`);
      await this.handleLeaveRoom(roomId, socket.userId, socket.userName || '未知用户');
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
    socket.on('disconnect', async () => {
      if (!socket.userId) return;
      logger.info(`用户 ${socket.userName} 断开聊天连接`);

      let roomsToLeave: string[] = [];

      if (isRedisConnected()) {
        const redis = getRedisClient();
        try {
          const userRoomsKey = `${USER_ROOMS_PREFIX}${socket.userId}`;
          roomsToLeave = await redis.sMembers(userRoomsKey);
          // 清理用户房间映射
          await redis.del(userRoomsKey);
        } catch {
          roomsToLeave = [...socket.rooms]
            .filter((r) => r.startsWith('room:'))
            .map((r) => r.replace('room:', ''));
        }
      } else {
        roomsToLeave = [...socket.rooms]
          .filter((r) => r.startsWith('room:'))
          .map((r) => r.replace('room:', ''));
      }

      for (const roomId of roomsToLeave) {
        await this.handleLeaveRoom(roomId, socket.userId!, socket.userName || '未知用户');
      }
    });
  }

  private async handleLeaveRoom(roomId: string, userId: string, userName: string): Promise<void> {
    await this.untrackRoomUser(roomId, userId);

    const leaveMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'system',
      userName: '系统',
      content: `${userName} 离开了房间`,
      timestamp: new Date(),
      type: 'SYSTEM',
    };
    this.io.to(`room:${roomId}`).emit('receive-message', leaveMsg);

    const remaining = await this.getRoomUsers(roomId);
    this.io.to(`room:${roomId}`).emit('room-update', {
      roomId,
      users: remaining,
      count: remaining.length,
    });
  }

  private async trackRoomUser(roomId: string, userId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await Promise.all([
        redis.sAdd(`${ROOM_ONLINE_PREFIX}${roomId}`, userId),
        redis.sAdd(`${USER_ROOMS_PREFIX}${userId}`, roomId),
      ]);
    } catch (error) {
      logger.error('Redis trackRoomUser failed', { error, roomId, userId });
    }
  }

  private async untrackRoomUser(roomId: string, userId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await Promise.all([
        redis.sRem(`${ROOM_ONLINE_PREFIX}${roomId}`, userId),
        redis.sRem(`${USER_ROOMS_PREFIX}${userId}`, roomId),
      ]);
    } catch (error) {
      logger.error('Redis untrackRoomUser failed', { error, roomId, userId });
    }
  }

  private async getRoomUsers(roomId: string): Promise<string[]> {
    if (!isRedisConnected()) return [];
    const redis = getRedisClient();
    try {
      return await redis.sMembers(`${ROOM_ONLINE_PREFIX}${roomId}`);
    } catch {
      return [];
    }
  }

  sendNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}
