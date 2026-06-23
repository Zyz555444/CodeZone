import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getAccessibleProjectIds } from '../lib/projectAccess';
import { getCachedOrFetch, invalidateCache } from '../lib/cache';

const createReviewSchema = z.object({
  projectId: z.string().min(1, '项目ID不能为空'),
  title: z.string().min(1, '审查标题不能为空').max(200, '标题不能超过200字'),
});

const updateReviewSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'MERGED']),
});

export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    const accessibleIds = await getAccessibleProjectIds(req.userId!);

    const where: any = {
      projectId: { in: accessibleIds },
    };

    if (projectId) {
      if (!accessibleIds.includes(projectId as string)) {
        res.status(403).json({ error: '无权访问此项目' });
        return;
      }
      where.projectId = projectId as string;
    }

    const cacheKey = projectId
      ? `reviews:project:${projectId}`
      : `reviews:user:${req.userId}`;

    const reviews = await getCachedOrFetch(cacheKey, () =>
      prisma.codeReview.findMany({
        where,
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    res.json({ reviews });
  } catch (error) {
    logger.error('获取审查列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取审查列表失败' });
  }
};

export const getReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.codeReview.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        project: {
          select: { id: true, name: true, ownerId: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!review) {
      res.status(404).json({ error: '审查不存在' });
      return;
    }

    const accessibleIds = await getAccessibleProjectIds(req.userId!);
    if (!accessibleIds.includes(review.projectId)) {
      res.status(403).json({ error: '无权访问此审查' });
      return;
    }

    res.json({ review });
  } catch (error) {
    logger.error('获取审查详情失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取审查详情失败' });
  }
};

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createReviewSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true, ownerId: true },
    });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    const isOwner = project.ownerId === req.userId;
    if (!isOwner) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: body.projectId, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权在此项目中创建审查' });
        return;
      }
    }

    const review = await prisma.codeReview.create({
      data: {
        projectId: body.projectId,
        title: body.title,
        authorId: req.userId!,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ review });

    invalidateCache(`reviews:project:${body.projectId}`).catch(() => {});
    invalidateCache(`reviews:user:${req.userId}`).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建审查失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建审查失败' });
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = updateReviewSchema.parse(req.body);

    const existing = await prisma.codeReview.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: '审查不存在' });
      return;
    }

    const isOwner = existing.project.ownerId === req.userId;
    const isAuthor = existing.authorId === req.userId;
    if (!isOwner && !isAuthor) {
      res.status(403).json({ error: '无权更新此审查' });
      return;
    }

    const review = await prisma.codeReview.update({
      where: { id },
      data: { status: body.status },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ review });

    invalidateCache(`reviews:project:${existing.projectId}`).catch(() => {});
    invalidateCache(`reviews:user:${req.userId}`).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新审查失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新审查失败' });
  }
};
