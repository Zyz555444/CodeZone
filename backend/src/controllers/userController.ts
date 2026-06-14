import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { username: { contains: q as string } },
        { email: { contains: q as string } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (error) {
    logger.error('获取用户列表失败', { error });
    res.status(500).json({ error: '获取用户列表失败' });
  }
};
