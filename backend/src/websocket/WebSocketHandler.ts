import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt';
import { logger } from '../utils/logger';
import { getRedisClient, isRedisConnected } from '../lib/redis';
import { createAndPushNotification } from '../lib/notificationService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  teamId?: string;
  userName?: string;
}

const TEAM_ONLINE_PREFIX = 'online:team:';

export class WebSocketHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket service initialized');
  }

  private authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;

      if (!token) {
        logger.warn('WebSocket authentication failed: token missing');
        return next(new Error('Missing authentication token'));
      }

      if (token.length < 10) {
        logger.warn('WebSocket authentication failed: invalid token format');
        return next(new Error('Invalid token format'));
      }

      let decoded: { userId: string };
      try {
        decoded = verifyToken(token);
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          logger.warn('WebSocket authentication failed: token expired');
          return next(new Error('Token expired'));
        }
        logger.warn('WebSocket authentication failed', { error });
        return next(new Error('Authentication failed'));
      }
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed', { error });
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`User ${socket.userId} connected to WebSocket`);

    // Join user-specific room for personal notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('join-team', async (teamId: string) => {
      try {
        if (!teamId) return;
        if (socket.teamId) {
          socket.leave(`team:${socket.teamId}`);
        }
        socket.join(`team:${teamId}`);
        socket.teamId = teamId;
        await this.trackTeamUser(socket.userId!, teamId);
        await this.broadcastTeamOnlineUsers(teamId);
        logger.info(`User ${socket.userId} joined team ${teamId}`);
      } catch (error) {
        logger.error('Error joining team', { error, userId: socket.userId, teamId });
      }
    });

    socket.on('leave-team', async (teamId: string) => {
      try {
        if (!teamId) return;
        socket.leave(`team:${teamId}`);
        await this.untrackTeamUser(socket.userId!, teamId);
        await this.broadcastTeamOnlineUsers(teamId);
        if (socket.teamId === teamId) {
          socket.teamId = undefined;
        }
        logger.info(`User ${socket.userId} left team ${teamId}`);
      } catch (error) {
        logger.error('Error leaving team', { error, userId: socket.userId, teamId });
      }
    });

    socket.on('code-change', (data: { projectId: string; fileId: string; content: string }) => {
      if (socket.teamId) {
        socket.to(`team:${socket.teamId}`).emit('code-change', {
          ...data,
          userId: socket.userId,
        });
      }
    });

    socket.on('cursor-move', (data: { projectId: string; fileId: string; position: { lineNumber: number; column: number } }) => {
      if (socket.teamId) {
        socket.to(`team:${socket.teamId}`).emit('cursor-move', {
          ...data,
          userId: socket.userId,
          userName: socket.userName || socket.userId,
        });
      }
    });

    socket.on('disconnect', async (reason) => {
      if (socket.teamId) {
        await this.untrackTeamUser(socket.userId!, socket.teamId);
        await this.broadcastTeamOnlineUsers(socket.teamId);
      }
      logger.info(`User ${socket.userId} disconnected`, { reason });
    });
  }

  private async trackTeamUser(userId: string, teamId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await redis.sAdd(`${TEAM_ONLINE_PREFIX}${teamId}`, userId);
    } catch (error) {
      logger.error('Redis trackTeamUser failed', { error, userId, teamId });
    }
  }

  private async untrackTeamUser(userId: string, teamId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      await redis.sRem(`${TEAM_ONLINE_PREFIX}${teamId}`, userId);
    } catch (error) {
      logger.error('Redis untrackTeamUser failed', { error, userId, teamId });
    }
  }

  private async broadcastTeamOnlineUsers(teamId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    try {
      const users = await redis.sMembers(`${TEAM_ONLINE_PREFIX}${teamId}`);
      this.io.to(`team:${teamId}`).emit('online-users', {
        count: users.length,
        users,
      });
    } catch (error) {
      logger.error('Redis broadcastTeamOnlineUsers failed', { error, teamId });
    }
  }

  sendNotification(userId: string, data: Record<string, unknown>): void {
    this.io.to(`user:${userId}`).emit('notification', data);
  }

  broadcastToTeam(teamId: string, event: string, data: Record<string, unknown>): void {
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  async pushNotification(
    userId: string,
    title: string,
    content: string,
    type: string
  ): Promise<void> {
    await createAndPushNotification(userId, title, content, type);
  }
}
