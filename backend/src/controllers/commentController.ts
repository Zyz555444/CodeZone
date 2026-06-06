import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

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
    throw error;
  }
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const body = createCommentSchema.parse(req.body);

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
    throw error;
  }
};
