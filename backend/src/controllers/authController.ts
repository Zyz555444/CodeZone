import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  username: z.string().min(3, '用户名至少需要 3 个字符'),
  password: z.string().min(6, '密码至少需要 6 个字符'),
});

const loginSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          { username: body.username },
        ],
      },
    });

    if (existingUser) {
      res.status(400).json({ error: '该邮箱或用户名已被注册' });
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        password: hashedPassword,
      },
    });

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    throw error;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.password) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(body.password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    throw error;
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: 将 token 加入黑名单或从数据库删除 session
    res.json({ success: true });
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({ user });
  } catch (error) {
    throw error;
  }
};
