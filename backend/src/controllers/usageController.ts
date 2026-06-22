import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export async function getUsage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' });
      return;
    }

    const userId = req.userId!;
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      res.status(403).json({ error: '仅团队管理员可查看用量' });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalUsage, perUser, perModel] = await Promise.all([
      prisma.aIUsageLog.aggregate({
        where: { teamId, createdAt: { gte: since } },
        _sum: { promptTokens: true, completionTokens: true },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['userId'],
        where: { teamId, createdAt: { gte: since } },
        _sum: { promptTokens: true, completionTokens: true },
        orderBy: { _sum: { promptTokens: 'desc' } },
      }),
      prisma.aIUsageLog.groupBy({
        by: ['modelId'],
        where: { teamId, createdAt: { gte: since } },
        _sum: { promptTokens: true, completionTokens: true },
      }),
    ]);

    const userIds = perUser.map(u => u.userId);
    const users = userIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.username]));

    res.json({
      period: { days, since: since.toISOString() },
      total: {
        promptTokens: totalUsage._sum.promptTokens || 0,
        completionTokens: totalUsage._sum.completionTokens || 0,
        totalTokens: (totalUsage._sum.promptTokens || 0) + (totalUsage._sum.completionTokens || 0),
      },
      perUser: perUser.map(u => ({
        userId: u.userId,
        username: userMap.get(u.userId) || 'Unknown',
        promptTokens: u._sum.promptTokens || 0,
        completionTokens: u._sum.completionTokens || 0,
      })),
      perModel: perModel.map(m => ({
        modelId: m.modelId || 'unknown',
        promptTokens: m._sum.promptTokens || 0,
        completionTokens: m._sum.completionTokens || 0,
      })),
    });
  } catch (error) {
    logger.error('获取用量失败', { error });
    res.status(500).json({ error: '获取用量失败' });
  }
}

export async function logUsage(teamId: string, userId: string, modelId: string, promptTokens: number, completionTokens: number): Promise<void> {
  try {
    await prisma.aIUsageLog.create({
      data: { teamId, userId, modelId, promptTokens, completionTokens },
    });
  } catch (error) {
    logger.error('记录用量失败', { error });
  }
}
