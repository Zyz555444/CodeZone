import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { username: { contains: q as string } },
        { email: { contains: q as string } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (error) {
    throw error;
  }
};
