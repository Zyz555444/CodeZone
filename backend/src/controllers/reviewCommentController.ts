import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { hasProjectAccess } from '../lib/projectAccess';

const createReviewCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
  fileId: z.string().optional().nullable(),
  line: z.number().int().positive().optional().nullable(),
});

export const getReviewComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    // 验证用户是否有权访问审查所属项目
    const review = await prisma.codeReview.findUnique({
      where: { id: reviewId },
      select: { projectId: true },
    });
    if (!review) {
      res.status(404).json({ error: '审查不存在' });
      return;
    }
    if (req.userId && !(await hasProjectAccess(req.userId, review.projectId))) {
      res.status(403).json({ error: '无权访问此审查' });
      return;
    }

    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    logger.error('获取审查评论失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取审查评论失败' });
  }
};

export const createReviewComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const body = createReviewCommentSchema.parse(req.body);

    const review = await prisma.codeReview.findUnique({
      where: { id: reviewId },
      select: { id: true, projectId: true },
    });
    if (!review) {
      res.status(404).json({ error: '审查不存在' });
      return;
    }

    // 验证用户是否有权限访问审查所属项目
    if (req.userId && !(await hasProjectAccess(req.userId, review.projectId))) {
      res.status(403).json({ error: '无权在此审查中添加评论' });
      return;
    }

    const comment = await prisma.reviewComment.create({
      data: {
        reviewId,
        userId: req.userId!,
        content: body.content,
        fileId: body.fileId || null,
        line: body.line || null,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建审查评论失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建审查评论失败' });
  }
};
