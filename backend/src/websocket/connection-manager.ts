import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { getRedisClient, isRedisConnected } from '../lib/redis';
import { logger } from '../utils/logger';
import { invalidateCache } from '../lib/cache';
import {
  AuthenticatedSocket,
  EVENTS,
  NotificationData,
  REDIS_PREFIXES,
} from './types';

/**
 * 连接生命周期管理器
 * 负责：
 * - 连接/断开时的 Redis 追踪
 * - 向用户/团队广播
 * - 通知持久化并实时推送
 */
export class ConnectionManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /** 获取 io 实例（handlers 内部需要广播时使用） */
  getIO(): Server {
    return this.io;
  }

  // ==================== 连接生命周期 ====================

  async onConnect(socket: AuthenticatedSocket): Promise<void> {
    logger.info(`User ${socket.data.userId} connected to WebSocket`);

    // 加入个人通知房间
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }
  }

  async onDisconnect(socket: AuthenticatedSocket): Promise<void> {
    logger.info(`User ${socket.data.userId} disconnected`, {
      reason: socket.data.userId ? 'disconnected' : 'unknown',
    });
  }

  // ==================== 团队在线追踪 ====================

  async trackTeamUser(userId: string, teamId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await redis.sAdd(`${REDIS_PREFIXES.TEAM_ONLINE}${teamId}`, userId);
    } catch (error) {
      logger.error('Redis trackTeamUser failed', { error, userId, teamId });
    }
  }

  async untrackTeamUser(userId: string, teamId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await redis.sRem(`${REDIS_PREFIXES.TEAM_ONLINE}${teamId}`, userId);
    } catch (error) {
      logger.error('Redis untrackTeamUser failed', { error, userId, teamId });
    }
  }

  async getTeamOnlineUsers(teamId: string): Promise<string[]> {
    if (!isRedisConnected()) return [];
    const redis = getRedisClient();
    try {
      return await redis.sMembers(`${REDIS_PREFIXES.TEAM_ONLINE}${teamId}`);
    } catch (error) {
      logger.error('Redis getTeamOnlineUsers failed', { error, teamId });
      return [];
    }
  }

  async broadcastTeamOnlineUsers(teamId: string): Promise<void> {
    const users = await this.getTeamOnlineUsers(teamId);
    this.io.to(`team:${teamId}`).emit(EVENTS.TEAM_ONLINE, {
      count: users.length,
      users,
    });
  }

  // ==================== 广播方法 ====================

  /** 向指定用户发送事件 */
  sendToUser(userId: string, event: string, data: unknown): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /** 向指定团队广播事件 */
  broadcastToTeam(teamId: string, event: string, data: unknown): void {
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  // ==================== 通知推送 ====================

  /**
   * 创建通知并实时推送给指定用户
   * 整合了原 notificationService.ts 的持久化 + 推送逻辑
   */
  async pushNotification(
    userId: string,
    title: string,
    content: string,
    type: string
  ): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: { userId, title, content, type },
      });

      this.io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION, {
        id: notification.id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        isRead: false,
        createdAt: notification.createdAt.toISOString(),
      } satisfies NotificationData);

      invalidateCache(`notifications:${userId}`).catch(() => {});
    } catch (error) {
      logger.error('推送通知失败', { error, userId });
    }
  }
}
