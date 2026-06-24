import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const updateProfileSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(30).optional(),
  bio: z.string().max(500).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6个字符').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '新密码需包含大小写字母和数字'),
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { username: { contains: q as string, mode: 'insensitive' } },
        { email: { contains: q as string, mode: 'insensitive' } },
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
    logger.error('获取用户列表失败', { error });
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const userId = req.userId!;

    if (body.username) {
      const existing = await prisma.user.findUnique({ where: { username: body.username } });
      if (existing && existing.id !== userId) {
        res.status(409).json({ error: '用户名已被占用' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.username && { username: body.username }),
        ...(body.bio !== undefined && { bio: body.bio }),
      },
      select: { id: true, username: true, email: true, avatar: true, bio: true },
    });

    res.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新用户资料失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新资料失败' });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = updatePasswordSchema.parse(req.body);
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      res.status(400).json({ error: '用户不存在或未设置密码' });
      return;
    }

    const isValid = await bcrypt.compare(body.currentPassword, user.password);
    if (!isValid) {
      res.status(400).json({ error: '当前密码不正确' });
      return;
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: '密码更新成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新密码失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新密码失败' });
  }
};
