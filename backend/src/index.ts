import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { WebSocketHandler } from './websocket/WebSocketHandler';
import { ChatWebSocketHandler } from './websocket/ChatWebSocketHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import codeRoutes from './routes/code';
import reviewRoutes from './routes/reviews';
import commentRoutes from './routes/comments';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

// Express 中间件配置
app.use(helmet({
  contentSecurityPolicy: false, // 允许前端加载资源
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO 初始化
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// WebSocket 处理器
const wsHandler = new WebSocketHandler(io);
const chatHandler = new ChatWebSocketHandler(io);
wsHandler.initialize();
chatHandler.initialize();

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
httpServer.listen(port, () => {
  logger.info(`CodeZone Backend 启动成功`, {
    port,
    environment: process.env.NODE_ENV,
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM 信号，正在关闭服务器');
  httpServer.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

export { app, io };
