import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const comments = await prisma.comment.findMany({
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
    });

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建评论失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建评论失败' });
  }
};
