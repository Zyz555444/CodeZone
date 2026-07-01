import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../lib/redis';
import { logger } from '../utils/logger';
import { wsAuth } from './auth';
import { ConnectionManager } from './connection-manager';
import { TeamHandler } from './team-handler';
import { ChatHandler } from './chat-handler';
import { CollaborationHandler } from './collaboration-handler';
import { TerminalHandler } from './terminal-handler';

export { ConnectionManager } from './connection-manager';
export { TeamHandler } from './team-handler';
export { ChatHandler } from './chat-handler';
export { CollaborationHandler } from './collaboration-handler';
export { TerminalHandler } from './terminal-handler';
export { wsAuth } from './auth';
export * from './types';

/**
 * 统一初始化所有 WebSocket 服务
 * 替代原有的分散初始化（WebSocketHandler、ChatWebSocketHandler、yServer、TerminalServer）
 */
export function initializeWebSocket(httpServer: http.Server): {
  io: Server;
  connMgr: ConnectionManager;
} {
  // Redis 适配器（集群支持）
  const redisClient = getRedisClient();
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  // Socket.IO 服务器（唯一 WebSocket 入口）
  const io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:12321',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // 统一认证中间件
  io.use(wsAuth);

  // 连接管理器
  const connMgr = new ConnectionManager(io);

  // 注册各 handler
  const teamHandler = new TeamHandler(connMgr);
  const chatHandler = new ChatHandler(connMgr);
  const collabHandler = new CollaborationHandler(io);
  const terminalHandler = new TerminalHandler();

  teamHandler.register(io);
  chatHandler.register(io);
  collabHandler.initialize();
  terminalHandler.register(io);

  // 统一连接/断开生命周期
  io.on('connection', (socket) => {
    connMgr.onConnect(socket);
    socket.on('disconnect', () => {
      connMgr.onDisconnect(socket);
    });
  });

  logger.info('All WebSocket services initialized (Unified Socket.IO entry)');

  return { io, connMgr };
}
