import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getCachedOrFetch, invalidateCache } from '../lib/cache';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await getCachedOrFetch(`notifications:${req.userId}`, () =>
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    );

    res.json({ notifications });
  } catch (error) {
    logger.error('获取通知失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取通知失败' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      res.status(404).json({ error: '通知不存在' });
      return;
    }

    if (notification.userId !== req.userId) {
      res.status(403).json({ error: '无权操作此通知' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    invalidateCache(`notifications:${req.userId}`).catch(() => {});

    res.json({ success: true });
  } catch (error) {
    logger.error('标记通知已读失败', { error, userId: req.userId });
    res.status(500).json({ error: '标记通知已读失败' });
  }
};
