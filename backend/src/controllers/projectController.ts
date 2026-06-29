import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { invalidateProjectAccessCache } from '../lib/projectAccess';
import { getRedisClient, isRedisConnected } from '../lib/redis';
import { getCachedOrFetch } from '../lib/cache';

async function invalidateProjectCachesByQuery(projectId: string): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  const affectedUsers = [
    ...members.map((m: { userId: string }) => m.userId),
    ...(project ? [project.ownerId] : []),
  ];

  await invalidateUserCaches(redis, affectedUsers);
}

async function invalidateProjectCachesForUsers(userIds: string[]): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  await invalidateUserCaches(redis, userIds);
}

async function invalidateUserCaches(redis: ReturnType<typeof getRedisClient>, userIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(userIds)];
  const dashboardKeys = uniqueIds.map((uid) => `dashboard:${uid}`);
  const projectKeys = uniqueIds.map((uid) => `projects:${uid}`);
  await redis.del([...dashboardKeys, ...projectKeys]);
  await invalidateProjectAccessCache(uniqueIds);
}

const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
});

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `projects:${req.userId}`;

    const projects = await getCachedOrFetch(cacheKey, () =>
      prisma.project.findMany({
        where: {
          OR: [
            { ownerId: req.userId },
            {
              members: {
                some: {
                  userId: req.userId,
                },
              },
            },
          ],
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
              files: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    res.json({ projects });
  } catch (error) {
    logger.error('获取项目列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取项目列表失败' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...body,
        ownerId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: 'OWNER',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({ project });
    invalidateProjectCachesByQuery(project.id).catch((err) => {
      logger.warn('缓存失效失败', { projectId: project.id, error: err });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建项目失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建项目失败' });
  }
};

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
            files: true,
            repositories: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 检查权限
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: req.userId,
      },
    });

    const isOwner = project.ownerId === req.userId;
    
    if (!member && !isOwner && project.visibility === 'PRIVATE') {
      res.status(403).json({ error: '无权访问该项目' });
      return;
    }

    res.json({ project });
  } catch (error) {
    logger.error('获取项目详情失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取项目详情失败' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = createProjectSchema.partial().parse(req.body);

    // 检查是否是所有者
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权修改项目' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: body,
    });

    res.json({ project: updatedProject });
    invalidateProjectCachesByQuery(id).catch((err) => {
      logger.warn('缓存失效失败', { projectId: id, error: err });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新项目失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新项目失败' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权删除项目' });
      return;
    }

    // 在删除项目前收集所有受影响用户（级联删除后无法查询成员）
    const membersToInvalidate = await prisma.projectMember.findMany({
      where: { projectId: id },
      select: { userId: true },
    });
    const affectedUserIds = [
      ...membersToInvalidate.map((m: { userId: string }) => m.userId),
      project.ownerId,
    ];

    await prisma.project.delete({
      where: { id },
    });

    // 失效缓存（失败不影响响应）

    invalidateProjectCachesForUsers(affectedUserIds).catch((err) => {
      logger.warn('缓存失效失败', { projectId: id, error: err });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除项目失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除项目失败' });
  }
};

export const getProjectMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, visibility: true },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    const isOwner = project.ownerId === req.userId;
    if (!isOwner) {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId: id, userId: req.userId },
      });
      if (!membership && project.visibility === 'PRIVATE') {
        res.status(403).json({ error: '无权访问此项目成员列表' });
        return;
      }
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    res.json({ members });
  } catch (error) {
    logger.error('获取项目成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取项目成员失败' });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      res.status(400).json({ error: '用户 ID 不能为空' });
      return;
    }

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 检查是否有权限
    if (project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权添加成员' });
      return;
    }

    // 检查被添加的用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    if (!targetUser) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    // 检查是否已是项目成员
    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (existingMember) {
      res.status(409).json({ error: '该用户已是项目成员' });
      return;
    }

    const validRoles = ['ADMIN', 'MEMBER'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `无效的角色，可选值: ${validRoles.join(', ')}` });
      return;
    }

    // 添加成员
    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({ member });
    invalidateProjectCachesByQuery(id).catch((err) => {
      logger.warn('缓存失效失败', { projectId: id, error: err });
    });
  } catch (error) {
    logger.error('添加项目成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '添加项目成员失败' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权移除成员' });
      return;
    }

    // 不能移除所有者自己
    if (userId === project.ownerId) {
      res.status(400).json({ error: '不能移除项目所有者' });
      return;
    }

    await prisma.projectMember.deleteMany({
      where: {
        projectId: id,
        userId,
      },
    });

    res.json({ success: true });
    invalidateProjectCachesByQuery(id).catch((err) => {
      logger.warn('缓存失效失败', { projectId: id, error: err });
    });
  } catch (error) {
    logger.error('移除项目成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '移除项目成员失败' });
  }
};
