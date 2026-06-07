import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  projectId?: string;
}

// JWT Secret validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}
const SECRET = JWT_SECRET || 'dev-secret-key-not-for-production';

export class WebSocketHandler {
  private io: Server;
  private connectedUsers: Map<string, Set<string>> = new Map();
  private readonly MAX_PROJECT_USERS = 100;

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

    const connectionTimeout = setTimeout(() => {
      if (!socket.projectId) {
        logger.warn(`User ${socket.userId} connection timeout`);
        socket.disconnect(true);
      }
    }, 30000);

    socket.on('join-project', (projectId: string) => {
      try {
        const currentUsers = this.connectedUsers.get(projectId)?.size || 0;
        if (currentUsers >= this.MAX_PROJECT_USERS) {
          socket.emit('error', { message: 'Project user limit reached' });
          return;
        }

        socket.join(`project:${projectId}`);
        socket.projectId = projectId;
        clearTimeout(connectionTimeout);
        this.trackUser(socket.userId!, projectId);
        this.broadcastOnlineUsers(projectId);
        logger.info(`User ${socket.userId} joined project ${projectId}`);
      } catch (error) {
        logger.error('Error joining project', { error, userId: socket.userId, projectId });
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    socket.on('leave-project', (projectId: string) => {
      try {
        socket.leave(`project:${projectId}`);
        this.untrackUser(socket.userId!, projectId);
        this.broadcastOnlineUsers(projectId);
        logger.info(`User ${socket.userId} left project ${projectId}`);
      } catch (error) {
        logger.error('Error leaving project', { error, userId: socket.userId, projectId });
      }
    });

    let lastCodeChange = 0;
    socket.on('code-change', (data: { projectId: string; fileId: string; content: string }) => {
      try {
        const now = Date.now();
        if (now - lastCodeChange < 100) return;
        lastCodeChange = now;

        if (!data.projectId || !data.fileId || typeof data.content !== 'string') return;
        if (data.content.length > 100000) {
          socket.emit('error', { message: 'Content too large' });
          return;
        }

        socket.to(`project:${data.projectId}`).emit('code-change', {
          ...data,
          userId: socket.userId,
        });
      } catch (error) {
        logger.error('Error handling code change', { error, userId: socket.userId });
      }
    });

    let lastCursorMove = 0;
    socket.on('cursor-move', (data: { projectId: string; fileId: string; position: any }) => {
      try {
        const now = Date.now();
        if (now - lastCursorMove < 50) return;
        lastCursorMove = now;

        socket.to(`project:${data.projectId}`).emit('cursor-move', {
          userId: socket.userId,
          ...data,
        });
      } catch (error) {
        logger.error('Error handling cursor move', { error, userId: socket.userId });
      }
    });

    socket.on('send-message', (data: { projectId: string; content: string }) => {
      try {
        if (!data.content || typeof data.content !== 'string') return;

        const trimmedContent = data.content.trim();
        if (trimmedContent.length === 0 || trimmedContent.length > 2000) {
          socket.emit('error', { message: 'Message must be 1-2000 characters' });
          return;
        }

        this.io.to(`project:${data.projectId}`).emit('receive-message', {
          userId: socket.userId,
          content: trimmedContent,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error handling message', { error, userId: socket.userId });
      }
    });

    socket.on('error', (error) => {
      logger.error('Socket error', { error, userId: socket.userId });
    });

    socket.on('disconnect', (reason) => {
      clearTimeout(connectionTimeout);
      if (socket.projectId) {
        this.untrackUser(socket.userId!, socket.projectId);
        this.broadcastOnlineUsers(socket.projectId);
      }
      logger.info(`User ${socket.userId} disconnected`, { reason });
    });
  }

  private trackUser(userId: string, projectId: string): void {
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

  sendNotification(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('notification', data);
  }

  broadcastToProject(projectId: string, event: string, data: any): void {
    this.io.to(`project:${projectId}`).emit(event, data);
  }
}
