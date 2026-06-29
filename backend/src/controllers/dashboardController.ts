import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getAccessibleProjectIds } from '../lib/projectAccess';
import { getRedisClient, isRedisConnected } from '../lib/redis';

const DASHBOARD_CACHE_TTL = 60; // 60 秒

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // 从 Redis 缓存中读取
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const cached = await redis.get(`dashboard:${userId}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }

    const accessibleProjectIds = await getAccessibleProjectIds(userId);

    // 新用户无项目时直接返回空统计
    if (accessibleProjectIds.length === 0) {
      res.json({
        stats: {
          totalProjects: 0,
          totalTasks: 0,
          myTasks: 0,
          teamMembers: 0,
          tasksByStatus: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, BLOCKED: 0 },
          tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
        },
        recentActivities: [],
      });
      return;
    }

    const [
      totalProjects,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      myTasks,
      teamMembers,
      recentActivities,
    ] = await Promise.all([
      prisma.project.count({ where: { id: { in: accessibleProjectIds } } }),
      prisma.task.count({ where: { projectId: { in: accessibleProjectIds } } }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: accessibleProjectIds } },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId: { in: accessibleProjectIds } },
        _count: true,
      }),
      prisma.task.count({
        where: {
          projectId: { in: accessibleProjectIds },
          assigneeId: userId,
          status: { not: 'DONE' },
        },
      }),
      prisma.teamMember.count({
        where: {
          team: {
            projects: { some: { id: { in: accessibleProjectIds } } },
          },
          status: 'ACTIVE',
        },
      }),
      prisma.activity.findMany({
        where: { projectId: { in: accessibleProjectIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const userIds = [...new Set(recentActivities.map((a: { userId: string }) => a.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const userMap = new Map(users.map((u: { id: string; username: string; avatar: string | null }) => [u.id, u]));

    const enrichedActivities = recentActivities.map((a: { id: string; type: string; content: string; metadata: any; projectId: string; createdAt: Date; userId: string }) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      metadata: a.metadata,
      projectId: a.projectId,
      createdAt: a.createdAt,
      user: userMap.get(a.userId) || null,
    }));

    const statusMap: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, BLOCKED: 0 };
    tasksByStatus.forEach((s: { status: string; _count: number }) => { statusMap[s.status] = s._count; });

    const priorityMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    tasksByPriority.forEach((p: { priority: string; _count: number }) => { priorityMap[p.priority] = p._count; });

    const stats = {
      totalProjects,
      totalTasks,
      myTasks,
      teamMembers,
      tasksByStatus: statusMap,
      tasksByPriority: priorityMap,
    };

    res.json({ stats, recentActivities: enrichedActivities });

    // 异步回写缓存（不阻塞响应）
    if (isRedisConnected()) {
      const redis = getRedisClient();
      redis.set(`dashboard:${userId}`, JSON.stringify({ stats, recentActivities: enrichedActivities }), { EX: DASHBOARD_CACHE_TTL }).catch((err) => {
        logger.warn('仪表盘缓存写入失败', { userId, error: err });
      });
    }
  } catch (error) {
    logger.error('获取仪表盘数据失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取仪表盘数据失败' });
  }
};
