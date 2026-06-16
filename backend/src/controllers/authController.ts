import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { signToken } from '../lib/jwt';

const registerSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  username: z.string().min(3, '用户名至少需要 3 个字符').max(30, '用户名最多 30 个字符'),
  password: z.string().min(6, '密码至少需要 6 个字符').max(100, '密码最多 100 个字符'),
});

const loginSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

// 密码强度验证
const isPasswordStrong = (password: string): boolean => {
  // 至少包含一个大写字母、一个小写字母和一个数字
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    // 密码强度检查
    if (!isPasswordStrong(body.password)) {
      res.status(400).json({ 
        error: '密码强度不足', 
        message: '密码必须包含至少一个大写字母、一个小写字母和一个数字' 
      });
      return;
    }

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
    const token = signToken(user.id);

    // 创建会话记录
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('用户注册成功', { userId: user.id, email: user.email });

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
    logger.error('注册失败', { error });
    res.status(500).json({ error: '注册失败，请稍后重试' });
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

    // 检查用户是否被禁用
    if (!user.isActive) {
      res.status(403).json({ error: '账号已被禁用，请联系管理员' });
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
    const token = signToken(user.id);

    // 创建会话记录用于登出时失效
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('用户登录成功', { userId: user.id, email: user.email });

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
    logger.error('登录失败', { error });
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // 删除会话记录使令牌失效
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    logger.info('用户登出', { userId: req.userId });
    res.json({ success: true, message: '登出成功' });
  } catch (error) {
    logger.error('登出失败', { error, userId: req.userId });
    res.status(500).json({ error: '登出失败' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: '未认证' });
      return;
    }

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

    // 获取用户所属的活跃团队
    const activeTeams = await prisma.teamMember.findMany({
      where: {
        userId: req.userId,
        status: 'ACTIVE',
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const hasTeam = activeTeams.length > 0;

    res.json({ user, hasTeam, teams: activeTeams.map((tm: any) => tm.team) });
  } catch (error) {
    logger.error('获取当前用户失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取用户信息失败' });
  }
};
