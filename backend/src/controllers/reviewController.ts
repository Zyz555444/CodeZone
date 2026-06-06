import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }

    const reviews = await prisma.codeReview.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reviews });
  } catch (error) {
    throw error;
  }
};

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, title } = req.body;

    const review = await prisma.codeReview.create({
      data: {
        projectId,
        title,
        authorId: req.userId!,
      },
    });

    res.status(201).json({ review });
  } catch (error) {
    throw error;
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const review = await prisma.codeReview.update({
      where: { id },
      data: { status },
    });

    res.json({ review });
  } catch (error) {
    throw error;
  }
};
