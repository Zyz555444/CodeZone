import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// 生成 8 位团队邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const createTeamSchema = z.object({
  name: z.string().min(1, '团队名称不能为空').max(50, '团队名称最多 50 个字符'),
});

const joinTeamSchema = z.object({
  inviteCode: z.string().min(8, '邀请码格式不正确').max(8, '邀请码格式不正确').regex(/^[A-Z2-9]{8}$/, '邀请码格式不正确'),
});

// 创建团队（创建者自动成为 ADMIN）
export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = createTeamSchema.parse(req.body);

    // 生成唯一邀请码（最多重试 5 次）
    let inviteCode = generateInviteCode();
    let codeExists = await prisma.team.findUnique({ where: { inviteCode } });
    let retries = 0;
    while (codeExists && retries < 5) {
      inviteCode = generateInviteCode();
      codeExists = await prisma.team.findUnique({ where: { inviteCode } });
      retries++;
    }
    if (codeExists) {
      res.status(500).json({ error: '生成邀请码失败，请重试' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name,
        inviteCode,
        ownerId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    logger.info('团队创建成功', { teamId: team.id, userId: req.userId });

    res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建团队失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建团队失败' });
  }
};

// 获取当前用户所属的团队
export const getMyTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.userId!,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, username: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            members: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ teams });
  } catch (error) {
    logger.error('获取团队列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取团队列表失败' });
  }
};

// 获取团队详情（含成员列表）
export const getTeamDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 检查用户是否是团队成员
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: req.userId! },
      },
    });

    if (!membership) {
      res.status(403).json({ error: '你不在该团队中' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        inviteCode: membership.role === 'ADMIN',
        owner: {
          select: { id: true, username: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatar: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: '团队不存在' });
      return;
    }

    res.json({ team });
  } catch (error) {
    logger.error('获取团队详情失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取团队详情失败' });
  }
};

// 获取团队邀请码（仅管理员可查看）
export const getInviteCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: req.userId! },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      res.status(403).json({ error: '仅团队管理员可查看邀请码' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, inviteCode: true },
    });

    if (!team) {
      res.status(404).json({ error: '团队不存在' });
      return;
    }

    res.json({ inviteCode: team.inviteCode });
  } catch (error) {
    logger.error('获取邀请码失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取邀请码失败' });
  }
};

// 通过邀请码申请加入团队
export const joinTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = joinTeamSchema.parse(req.body);

    const team = await prisma.team.findUnique({
      where: { inviteCode },
    });

    if (!team) {
      res.status(404).json({ error: '邀请码无效，未找到对应团队' });
      return;
    }

    // 检查是否已在团队中
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: team.id, userId: req.userId! },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === 'ACTIVE') {
        res.status(400).json({ error: '你已是该团队的一员' });
        return;
      }
      if (existingMembership.status === 'PENDING') {
        res.status(400).json({ error: '你已提交申请，请等待管理员审核' });
        return;
      }
      // REJECTED: 允许重新申请
      await prisma.teamMember.update({
        where: { id: existingMembership.id },
        data: { status: 'PENDING' },
      });
    } else {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: req.userId!,
          role: 'MEMBER',
          status: 'PENDING',
        },
      });
    }

    logger.info('申请加入团队', { teamId: team.id, userId: req.userId });

    res.json({ success: true, message: '申请已提交，请等待管理员审核', teamName: team.name });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('加入团队失败', { error, userId: req.userId });
    res.status(500).json({ error: '加入团队失败' });
  }
};

// 批准成员加入（仅管理员可操作）
export const approveMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, userId } = req.params;

    // 检查操作者是否是管理员
    const operatorMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: req.userId! },
      },
    });

    if (!operatorMembership || operatorMembership.role !== 'ADMIN') {
      res.status(403).json({ error: '仅团队管理员可批准成员' });
      return;
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!member) {
      res.status(404).json({ error: '该用户未申请加入团队' });
      return;
    }

    if (member.status === 'ACTIVE') {
      res.status(400).json({ error: '该用户已是团队成员' });
      return;
    }

    await prisma.teamMember.update({
      where: { id: member.id },
      data: { status: 'ACTIVE' },
    });

    logger.info('批准成员加入团队', { teamId, userId, operatorId: req.userId });

    res.json({ success: true, message: '已批准成员加入' });
  } catch (error) {
    logger.error('批准成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '批准成员失败' });
  }
};

// 拒绝成员加入（仅管理员可操作）
export const rejectMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, userId } = req.params;

    const operatorMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: req.userId! },
      },
    });

    if (!operatorMembership || operatorMembership.role !== 'ADMIN') {
      res.status(403).json({ error: '仅团队管理员可拒绝成员' });
      return;
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!member) {
      res.status(404).json({ error: '该用户未申请加入团队' });
      return;
    }

    if (member.role === 'ADMIN') {
      res.status(400).json({ error: '不能拒绝团队管理员' });
      return;
    }

    await prisma.teamMember.delete({
      where: { id: member.id },
    });

    logger.info('拒绝成员加入团队', { teamId, userId, operatorId: req.userId });

    res.json({ success: true, message: '已拒绝该成员的申请' });
  } catch (error) {
    logger.error('拒绝成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '拒绝成员失败' });
  }
};

// 获取待审核的成员列表（仅管理员可查看）
export const getPendingMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: req.userId! },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      res.status(403).json({ error: '仅团队管理员可查看待审核列表' });
      return;
    }

    const pendingMembers = await prisma.teamMember.findMany({
      where: {
        teamId: id,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ pendingMembers });
  } catch (error) {
    logger.error('获取待审核成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取待审核成员失败' });
  }
};
