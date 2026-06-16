import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { sanitizeBody } from './middleware/sanitize';
import { WebSocketHandler } from './websocket/WebSocketHandler';
import { ChatWebSocketHandler } from './websocket/ChatWebSocketHandler';
import { setupCollaborationServer } from './collaboration/yServer';
import { setIO } from './lib/notificationService';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import codeRoutes from './routes/code';
import fileRoutes from './routes/files';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import teamRoutes from './routes/teams';
import feedbackRoutes from './routes/feedback';
import repositoryRoutes from './routes/repositories';
import searchRoutes from './routes/search';
import activityRoutes from './routes/activities';
import dashboardRoutes from './routes/dashboard';
import dependencyRoutes from './routes/dependencies';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 10101;

// 安全中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS 配置
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:12321';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24小时
}));

// 压缩响应
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
}));

// 请求体大小限制
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 通用速率限制
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个 IP 限制 100 次请求
  message: { error: '请求过于频繁，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ error: '请求过于频繁，请稍后重试' });
  },
});

// 严格速率限制（用于认证端点）
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 每个 IP 限制 5 次请求
  message: { error: '登录尝试次数过多，请 15 分钟后重试' },
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ error: '登录尝试次数过多，请 15 分钟后重试' });
  },
});

// 密码更新专用速率限制（每个 IP 15 分钟 3 次）
const passwordUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: '密码更新尝试次数过多，请 15 分钟后重试' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Password update rate limit exceeded', { ip: req.ip });
    res.status(429).json({ error: '密码更新尝试次数过多，请 15 分钟后重试' });
  },
});

// 用户资料更新专用速率限制（每个 IP 15 分钟 10 次）
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '资料更新请求过于频繁，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Profile update rate limit exceeded', { ip: req.ip });
    res.status(429).json({ error: '资料更新请求过于频繁，请稍后重试' });
  },
});

// 应用通用速率限制
app.use(generalLimiter);

// 额外安全响应头（helmet 已提供部分，此处补充）
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// GET 请求缓存控制中间件（浏览器缓存 30 秒）
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, max-age=30');
  }
  next();
});

// Socket.IO 初始化
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

setIO(io);

// WebSocket 处理器
const wsHandler = new WebSocketHandler(io);
const chatHandler = new ChatWebSocketHandler(io);
wsHandler.initialize();
chatHandler.initialize();

// Yjs 协作编辑服务
setupCollaborationServer(httpServer);

// 路由 - 认证端点使用严格限制
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);
app.use('/api/auth', sanitizeBody, authRoutes);
app.use('/api/users', userRoutes);
// 密码更新端点专用限流
app.use('/api/users/password', passwordUpdateLimiter);
// 用户资料更新端点专用限流
app.use('/api/users/profile', profileUpdateLimiter);
// 对所有写操作路由应用输入清理
app.use('/api/projects', sanitizeBody, projectRoutes);
app.use('/api/tasks', dependencyRoutes);
app.use('/api/tasks', sanitizeBody, taskRoutes);
app.use('/api/code', sanitizeBody, codeRoutes);
app.use('/api/files', sanitizeBody, fileRoutes);
app.use('/api/reviews', sanitizeBody, reviewRoutes);
app.use('/api/notifications', sanitizeBody, notificationRoutes);
app.use('/api/teams', sanitizeBody, teamRoutes);
app.use('/api/feedback', sanitizeBody, feedbackRoutes);
app.use('/api/repositories', sanitizeBody, repositoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', sanitizeBody, aiRoutes);

// 健康检查 - 不记录日志
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use(errorHandler);

// 未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// 未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// 启动服务器
httpServer.listen({
  port: Number(port),
  host: '0.0.0.0',
}, () => {
  logger.info(`CodeZone Backend started`, {
    port,
    host: '0.0.0.0',
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
});

export { app, io };
