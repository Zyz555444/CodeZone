import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';

const updateAIPermissionSchema = z.object({
  aiEnabled: z.boolean(),
});

export async function updateAIPermission(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId, memberId } = req.params;
    const { aiEnabled } = updateAIPermissionSchema.parse(req.body);

    const userId = req.userId!;
    const requester = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });

    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      res.status(403).json({ error: '仅团队管理员可管理 AI 权限' });
      return;
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { teamId: true, userId: true, role: true },
    });

    if (!member || member.teamId !== teamId) {
      res.status(404).json({ error: '成员不存在' });
      return;
    }

    if (member.role === 'OWNER' && requester.role !== 'OWNER') {
      res.status(403).json({ error: '无法修改 OWNER 的权限' });
      return;
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { aiEnabled },
    });

    res.json({ member: { id: updated.id, aiEnabled: updated.aiEnabled } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    logger.error('更新 AI 权限失败', { error });
    res.status(500).json({ error: '更新 AI 权限失败' });
  }
}

export async function checkAIAccess(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const userId = req.userId!;

    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { aiEnabled: true, status: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      res.status(403).json({ error: '您不是该团队的活跃成员' });
      return;
    }

    res.json({ aiEnabled: member.aiEnabled });
  } catch (error) {
    logger.error('检查 AI 权限失败', { error });
    res.status(500).json({ error: '检查权限失败' });
  }
}
