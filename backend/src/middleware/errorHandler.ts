import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('错误发生', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      error: '数据库操作失败',
      message: err.message,
    });
    return;
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: '无效的令牌',
    });
    return;
  }

  // Zod 验证错误
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: '验证失败',
      details: (err as any).errors,
    });
    return;
  }

  // 默认错误
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
  });
};
