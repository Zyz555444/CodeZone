import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未提供认证令牌' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('认证失败', { error });
    res.status(401).json({ error: '无效的认证令牌' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (roles.length > 0) {
      // TODO: 从数据库获取用户角色并验证
      // 这里先简单通过
    }

    next();
  };
};
