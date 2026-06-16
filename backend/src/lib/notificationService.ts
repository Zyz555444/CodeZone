import { Server } from 'socket.io';
import { prisma } from './prisma';
import { logger } from '../utils/logger';

let io: Server | null = null;

export function setIO(server: Server): void {
  io = server;
}

export async function createAndPushNotification(
  userId: string,
  title: string,
  content: string,
  type: string
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: { userId, title, content, type: type as any },
    });

    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        isRead: false,
        createdAt: notification.createdAt.toISOString(),
      });
    }
  } catch (error) {
    logger.error('创建并推送通知失败', { error, userId });
  }
}
