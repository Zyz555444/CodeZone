import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未提供认证令牌' });
      return;
    }

    const token = authHeader.substring(7);
    
    // 验证 token 不为空
    if (!token || token.length < 10) {
      res.status(401).json({ error: '无效的认证令牌格式' });
      return;
    }
    
    let decoded: { userId: string };
    try {
      decoded = verifyToken(token);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ error: '认证令牌已过期' });
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ error: '无效的认证令牌' });
        return;
      }
      throw error;
    }

    // 验证会话是否仍然有效（未被登出）
    const { prisma } = await import('../lib/prisma');
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      res.status(401).json({ error: '认证令牌已失效' });
      return;
    }
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('认证失败', { error });
    res.status(401).json({ error: '认证失败' });
  }
};

export const authorize = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (roles.length > 0) {
      try {
        const { prisma } = await import('../lib/prisma');
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { role: true, isActive: true },
        });

        if (!user || !user.isActive) {
          res.status(401).json({ error: '账户不可用' });
          return;
        }

        if (!roles.includes(user.role)) {
          res.status(403).json({ error: '权限不足' });
          return;
        }
      } catch (error) {
        logger.error('授权检查失败', { error, userId: req.userId });
        res.status(500).json({ error: '授权检查失败' });
        return;
      }
    }

    next();
  };
};
