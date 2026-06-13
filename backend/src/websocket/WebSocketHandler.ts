import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  teamId?: string;
}

// JWT Secret validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}
const SECRET = JWT_SECRET || 'dev-secret-key-not-for-production';

export class WebSocketHandler {
  private io: Server;
  private teamUsers: Map<string, Set<string>> = new Map();

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

      const decoded = jwt.verify(token, SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('WebSocket authentication failed: token expired');
        return next(new Error('Token expired'));
      }
      logger.warn('WebSocket authentication failed', { error });
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`User ${socket.userId} connected to WebSocket`);

    socket.on('join-team', (teamId: string) => {
      try {
        if (!teamId) return;
        if (socket.teamId) {
          socket.leave(`team:${socket.teamId}`);
        }
        socket.join(`team:${teamId}`);
        socket.teamId = teamId;
        this.trackTeamUser(socket.userId!, teamId);
        this.broadcastTeamOnlineUsers(teamId);
        logger.info(`User ${socket.userId} joined team ${teamId}`);
      } catch (error) {
        logger.error('Error joining team', { error, userId: socket.userId, teamId });
      }
    });

    socket.on('leave-team', (teamId: string) => {
      try {
        if (!teamId) return;
        socket.leave(`team:${teamId}`);
        this.untrackTeamUser(socket.userId!, teamId);
        this.broadcastTeamOnlineUsers(teamId);
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
          userName: socket.userId,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      if (socket.teamId) {
        this.untrackTeamUser(socket.userId!, socket.teamId);
        this.broadcastTeamOnlineUsers(socket.teamId);
      }
      logger.info(`User ${socket.userId} disconnected`, { reason });
    });
  }

  private trackTeamUser(userId: string, teamId: string): void {
    if (!this.teamUsers.has(teamId)) {
      this.teamUsers.set(teamId, new Set());
    }
    this.teamUsers.get(teamId)!.add(userId);
  }

  private untrackTeamUser(userId: string, teamId: string): void {
    const users = this.teamUsers.get(teamId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.teamUsers.delete(teamId);
      }
    }
  }

  private broadcastTeamOnlineUsers(teamId: string): void {
    const users = Array.from(this.teamUsers.get(teamId) || []);
    this.io.to(`team:${teamId}`).emit('online-users', {
      count: users.length,
      users,
    });
  }

  sendNotification(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('notification', data);
  }

  broadcastToTeam(teamId: string, event: string, data: any): void {
    this.io.to(`team:${teamId}`).emit(event, data);
  }
}
