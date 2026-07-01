import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { getRedisClient, isRedisConnected } from '../lib/redis';
import { logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import {
  AuthenticatedSocket,
  EVENTS,
  ChatMessage,
  ChatRoomUpdate,
  ChatTypingData,
  REDIS_PREFIXES,
} from './types';

/**
 * 聊天处理器
 * 负责：
 * - 聊天房间的加入/离开管理
 * - 消息收发并持久化到 ChatMessage 表
 * - 历史消息加载
 * - 输入状态（typing）广播
 * - Redis 房间在线用户追踪
 */
export class ChatHandler {
  private connMgr: ConnectionManager;
  private io: Server | null = null;

  constructor(connMgr: ConnectionManager) {
    this.connMgr = connMgr;
  }

  register(io: Server): void {
    this.io = io;

    io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.data.userId) {
        logger.warn('Chat WebSocket: unauthenticated connection rejected');
        socket.disconnect(true);
        return;
      }

      this.handleConnection(socket);
    });

    logger.info('Chat WebSocket service initialized');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const io = this.io!;
    // 默认用户名：userId 前 8 位
    socket.data.userName = socket.data.userId!.slice(0, 8);

    // 异步获取真实用户名
    prisma.user.findUnique({
      where: { id: socket.data.userId! },
      select: { username: true },
    }).then((dbUser: any) => {
      if (dbUser?.username) {
        socket.data.userName = dbUser.username;
      }
    }).catch((err: unknown) => {
      logger.warn('Failed to get username', { userId: socket.data.userId!, error: err });
    });

    // 加入个人房间
    socket.join(`user:${socket.data.userId}`);
    logger.info(`User ${socket.data.userName} (${socket.data.userId}) connected chat`);

    // 加入聊天房间
    socket.on(EVENTS.CHAT_JOIN, async (roomId: string) => {
      try {
        if (!roomId || !socket.data.userId) return;

        socket.join(`room:${roomId}`);
        await this.trackRoomUser(roomId, socket.data.userId);

        const users = await this.getRoomUsers(roomId);
        io.to(`room:${roomId}`).emit(EVENTS.CHAT_ROOM_UPDATE, {
          roomId,
          users,
          count: users.length,
        } satisfies ChatRoomUpdate);

        // 从数据库加载最近 50 条消息
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
        socket.emit(EVENTS.CHAT_HISTORY, { roomId, messages: history });

        // 广播加入消息（系统消息，不入库）
        const joinMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: 'system',
          userName: '系统',
          content: `${socket.data.userName} 加入了房间`,
          timestamp: new Date(),
          type: 'SYSTEM',
        };
        io.to(`room:${roomId}`).emit(EVENTS.CHAT_MESSAGE_RECEIVE, joinMsg);

        logger.info(`User ${socket.data.userName} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room', { error, userId: socket.data.userId, roomId });
      }
    });

    // 离开聊天房间
    socket.on(EVENTS.CHAT_LEAVE, async (roomId: string) => {
      if (!roomId || !socket.data.userId) return;
      socket.leave(`room:${roomId}`);
      await this.handleLeaveRoom(roomId, socket.data.userId, socket.data.userName || '未知用户');
    });

    // 发送消息
    socket.on(EVENTS.CHAT_MESSAGE_SEND, async (data: { roomId: string; content: string }) => {
      if (!data.roomId || !data.content?.trim() || !socket.data.userId) return;

      const userName = socket.data.userName || socket.data.userId!.slice(0, 8);
      const message: ChatMessage = {
        id: '',
        userId: socket.data.userId,
        userName,
        content: data.content.trim(),
        timestamp: new Date(),
        type: 'TEXT',
      };

      // 持久化到数据库
      try {
        const saved = await prisma.chatMessage.create({
          data: {
            roomId: data.roomId,
            userId: socket.data.userId,
            userName,
            content: data.content.trim(),
            type: 'TEXT',
          },
        });
        message.id = saved.id;
      } catch (error) {
        logger.error('Failed to save message', { error });
        // fallback temporary ID
        message.id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }

      io.to(`room:${data.roomId}`).emit(EVENTS.CHAT_MESSAGE_RECEIVE, message);
    });

    // 输入状态
    socket.on(EVENTS.CHAT_TYPING_START, (data: { roomId: string }) => {
      if (!data.roomId || !socket.data.userId) return;
      socket.to(`room:${data.roomId}`).emit(EVENTS.CHAT_TYPING_START, {
        userId: socket.data.userId,
        userName: socket.data.userName,
        roomId: data.roomId,
      } satisfies ChatTypingData);
    });

    socket.on(EVENTS.CHAT_TYPING_STOP, (data: { roomId: string }) => {
      if (!data.roomId || !socket.data.userId) return;
      socket.to(`room:${data.roomId}`).emit(EVENTS.CHAT_TYPING_STOP, {
        userId: socket.data.userId,
        roomId: data.roomId,
      } satisfies ChatTypingData);
    });

    // 断开连接
    socket.on('disconnect', async () => {
      if (!socket.data.userId) return;
      logger.info(`User ${socket.data.userName} disconnected from chat`);

      let roomsToLeave: string[] = [];

      if (isRedisConnected()) {
        const redis = getRedisClient();
        try {
          const userRoomsKey = `${REDIS_PREFIXES.USER_ROOMS}${socket.data.userId}`;
          roomsToLeave = await redis.sMembers(userRoomsKey);
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
        await this.handleLeaveRoom(roomId, socket.data.userId!, socket.data.userName || '未知用户');
      }
    });
  }

  // ==================== 房间管理辅助方法 ====================

  private async handleLeaveRoom(
    roomId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.untrackRoomUser(roomId, userId);

    const leaveMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'system',
      userName: '系统',
      content: `${userName} 离开了房间`,
      timestamp: new Date(),
      type: 'SYSTEM',
    };
    this.io!.to(`room:${roomId}`).emit(EVENTS.CHAT_MESSAGE_RECEIVE, leaveMsg);

    const remaining = await this.getRoomUsers(roomId);
    this.io!.to(`room:${roomId}`).emit(EVENTS.CHAT_ROOM_UPDATE, {
      roomId,
      users: remaining,
      count: remaining.length,
    } satisfies ChatRoomUpdate);
  }

  private async trackRoomUser(roomId: string, userId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await Promise.all([
        redis.sAdd(`${REDIS_PREFIXES.ROOM_ONLINE}${roomId}`, userId),
        redis.sAdd(`${REDIS_PREFIXES.USER_ROOMS}${userId}`, roomId),
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
        redis.sRem(`${REDIS_PREFIXES.ROOM_ONLINE}${roomId}`, userId),
        redis.sRem(`${REDIS_PREFIXES.USER_ROOMS}${userId}`, roomId),
      ]);
    } catch (error) {
      logger.error('Redis untrackRoomUser failed', { error, roomId, userId });
    }
  }

  private async getRoomUsers(roomId: string): Promise<string[]> {
    if (!isRedisConnected()) return [];
    const redis = getRedisClient();
    try {
      return await redis.sMembers(`${REDIS_PREFIXES.ROOM_ONLINE}${roomId}`);
    } catch {
      return [];
    }
  }
}
