import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  projectId?: string;
  rooms: Set<string>;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

interface ChatRoom {
  id: string;
  name: string;
  messages: ChatMessage[];
  users: Set<string>;
}

export class ChatWebSocketHandler {
  private io: Server;
  private rooms: Map<string, ChatRoom> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('聊天 WebSocket 服务已初始化');
  }

  private authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;
      
      if (!token) {
        return next(new Error('认证 token 缺失'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; username: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`用户 ${socket.userId} 已连接聊天 WebSocket`);

    // 加入用户专属房间
    socket.join(`user:${socket.userId}`);
    this.trackUser(socket.userId!, socket.id);

    // 加入聊天房间
    socket.on('join-room', (roomId: string) => {
      socket.join(`room:${roomId}`);
      
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, { id: roomId, name: `房间 ${roomId}`, messages: [], users: new Set() });
      }
      
      const room = this.rooms.get(roomId)!;
      room.users.add(socket.userId!);
      
      // 通知房间新成员
      this.io.to(`room:${roomId}`).emit('room-update', {
        roomId,
        users: Array.from(room.users),
        messageCount: room.messages.length,
      });
      
      // 发送历史消息
      socket.emit('room-history', { roomId, messages: room.messages.slice(-50) });
      
      // 广播系统消息
      this.io.to(`room:${roomId}`).emit('receive-message', {
        id: `system-${Date.now()}`,
        userId: 'system',
        userName: '系统',
        content: `${socket.userId} 加入了房间`,
        timestamp: new Date(),
        type: 'system',
      });
      
      logger.info(`用户 ${socket.userId} 加入房间 ${roomId}`);
    });

    // 离开聊天房间
    socket.on('leave-room', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      this.handleUserLeaveRoom(roomId, socket.userId!);
    });

    // 发送消息
    socket.on('send-message', async (data: { roomId: string; content: string }) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: socket.userId!,
        userName: socket.userId!.slice(0, 8),
        content: data.content,
        timestamp: new Date(),
        type: 'text',
      };

      // 保存到房间历史
      const room = this.rooms.get(data.roomId);
      if (room) {
        room.messages.push(message);
        // 限制历史消息数量
        if (room.messages.length > 200) {
          room.messages = room.messages.slice(-200);
        }
      }

      // 广播到房间
      this.io.to(`room:${data.roomId}`).emit('receive-message', message);

      logger.info(`用户 ${socket.userId} 在房间 ${data.roomId} 发送消息`);
    });

    // 输入状态
    socket.on('typing-start', (data: { roomId: string }) => {
      socket.to(`room:${data.roomId}`).emit('user-typing', {
        userId: socket.userId,
        roomId: data.roomId,
      });
    });

    socket.on('typing-stop', (data: { roomId: string }) => {
      socket.to(`room:${data.roomId}`).emit('user-stop-typing', {
        userId: socket.userId,
        roomId: data.roomId,
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private handleUserLeaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(userId);
      
      // 广播离开消息
      this.io.to(`room:${roomId}`).emit('receive-message', {
        id: `system-${Date.now()}`,
        userId: 'system',
        userName: '系统',
        content: `${userId} 离开了房间`,
        timestamp: new Date(),
        type: 'system',
      });

      this.io.to(`room:${roomId}`).emit('room-update', {
        roomId,
        users: Array.from(room.users),
      });

      // 如果房间为空，清理房间
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    if (!socket.userId) return;

    logger.info(`用户 ${socket.userId} 断开聊天连接`);
    this.untrackUser(socket.userId, socket.id);

    // 离开所有房间
    const rooms = Array.from(this.rooms.entries());
    for (const [roomId, room] of rooms) {
      if (room.users.has(socket.userId!)) {
        this.handleUserLeaveRoom(roomId, socket.userId!);
      }
    }

    // 通知好友
    this.io.emit('user-offline', { userId: socket.userId });
  }

  private trackUser(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    
    // 通知好友在线
    this.io.emit('user-online', { userId });
  }

  private untrackUser(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // 发送私信
  sendDirectMessage(toUserId: string, message: ChatMessage): void {
    this.io.to(`user:${toUserId}`).emit('direct-message', message);
  }

  // 发送通知
  sendNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  // 广播到项目
  broadcastToProject(projectId: string, event: string, data: any): void {
    this.io.to(`project:${projectId}`).emit(event, data);
  }
}
