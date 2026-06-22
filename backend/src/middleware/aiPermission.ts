import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export async function checkAIPermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const teamId = req.body?.teamId || req.query?.teamId as string;

  if (!teamId) {
    next();
    return;
  }

  try {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: req.userId! } },
      select: { aiEnabled: true, status: true, role: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      res.status(403).json({ error: '您不是该团队的活跃成员' });
      return;
    }

    if (!member.aiEnabled) {
      res.status(403).json({ error: '您的 AI 功能已被管理员禁用' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: '权限检查失败' });
  }
}
