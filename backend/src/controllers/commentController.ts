import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { hasProjectAccess } from '../lib/projectAccess';
import { getCachedOrFetch, invalidateCache } from '../lib/cache';

const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    // 验证用户是否有权访问该任务所属项目
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    if (req.userId && !(await hasProjectAccess(req.userId, task.projectId))) {
      res.status(403).json({ error: '无权访问此任务' });
      return;
    }

    const comments = await getCachedOrFetch(`comments:task:${taskId}`, () =>
      prisma.comment.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    );

    res.json({ comments });
  } catch (error) {
    logger.error('获取评论失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取评论失败' });
  }
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const body = createCommentSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, ownerId: true } } },
    });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const isOwner = task.project.ownerId === req.userId;
    if (!isOwner) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.project.id, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权评论此任务' });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: req.userId!,
        content: body.content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({ comment });

    invalidateCache(`comments:task:${taskId}`).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建评论失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建评论失败' });
  }
};
