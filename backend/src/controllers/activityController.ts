import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return projects.map((p: { id: string }) => p.id);
}

export const getActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    const userId = req.userId!;

    const accessibleProjectIds = await getAccessibleProjectIds(userId);

    const where: any = {
      projectId: { in: accessibleProjectIds },
    };

    if (projectId) {
      where.projectId = projectId as string;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const userIds = [...new Set(activities.map((a: { userId: string }) => a.userId))];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });

    const userMap = new Map(users.map((u: { id: string; username: string; avatar: string | null }) => [u.id, u]));

    const enriched = activities.map((activity: { id: string; type: string; content: string; metadata: any; projectId: string; createdAt: Date; userId: string }) => ({
      id: activity.id,
      type: activity.type,
      content: activity.content,
      metadata: activity.metadata,
      projectId: activity.projectId,
      createdAt: activity.createdAt,
      user: userMap.get(activity.userId) || null,
    }));

    res.json({ activities: enriched });
  } catch (error) {
    logger.error('获取活动列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取活动列表失败' });
  }
};
