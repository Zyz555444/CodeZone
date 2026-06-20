import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { invalidateProjectAccessCache } from '../lib/projectAccess';
import { getRedisClient, isRedisConnected } from '../lib/redis';

async function invalidateProjectCaches(projectId: string): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();

  // 获取所有项目成员
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  // 获取项目所有者
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  const affectedUsers = [
    ...members.map((m: { userId: string }) => m.userId),
    ...(project ? [project.ownerId] : []),
  ];

  // 失效仪表盘缓存
  const dashboardKeys = affectedUsers.map((uid) => `dashboard:${uid}`);
  await redis.del(dashboardKeys);

  // 失效项目访问缓存
  await invalidateProjectAccessCache(affectedUsers);
}

const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
});

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
    invalidateProjectCaches(project.id).catch(() => {});
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

    // 在删除项目前收集所有受影响用户（防止级联删除后查不到成员）
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
    if (isRedisConnected()) {
      const redis = getRedisClient();
      try {
        await redis.del(affectedUserIds.map((uid) => `dashboard:${uid}`));
        await invalidateProjectAccessCache(affectedUserIds);
      } catch {
        // 缓存失效失败不影响业务
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('删除项目失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除项目失败' });
  }
};

export const getProjectMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    // 添加成员
    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId,
        role: role || 'MEMBER',
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
    invalidateProjectCaches(id).catch(() => {});
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
    invalidateProjectCaches(id).catch(() => {});
  } catch (error) {
    logger.error('移除项目成员失败', { error, userId: req.userId });
    res.status(500).json({ error: '移除项目成员失败' });
  }
};
