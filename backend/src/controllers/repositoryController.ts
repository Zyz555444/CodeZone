import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getCachedOrFetch, invalidateCache } from '../lib/cache';

const createRepositorySchema = z.object({
  projectId: z.string().min(1, '项目 ID 不能为空'),
  name: z.string().min(1, '仓库名称不能为空'),
  url: z.string().optional(),
  provider: z.string().default('internal'),
  branch: z.string().default('main'),
});

const updateRepositorySchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().optional(),
  provider: z.string().optional(),
  branch: z.string().optional(),
});

const createCommitSchema = z.object({
  hash: z.string().min(1, '提交哈希不能为空').max(100, '哈希长度不能超过100'),
  message: z.string().min(1, '提交信息不能为空').max(500, '提交信息长度不能超过500'),
  branch: z.string().min(1, '分支名称不能为空').max(100, '分支名称长度不能超过100'),
});

async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (member) return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project?.ownerId === userId;
}

async function checkProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project?.ownerId === userId;
}

export const getRepositories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const hasAccess = await checkProjectAccess(projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权访问该项目' });
      return;
    }

    const repositories = await getCachedOrFetch(`repos:project:${projectId}`, () =>
      prisma.repository.findMany({
        where: { projectId },
        include: {
          _count: {
            select: { commits: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    res.json({ repositories });
  } catch (error) {
    logger.error('获取仓库列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取仓库列表失败' });
  }
};

export const getRepository = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id },
      include: {
        commits: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const hasAccess = await checkProjectAccess(repository.projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权访问该仓库' });
      return;
    }

    const branches = await prisma.commit.findMany({
      where: { repositoryId: id },
      distinct: ['branch'],
      select: { branch: true },
    });

    res.json({
      repository: {
        ...repository,
        branches: branches.map((b: { branch: string }) => b.branch),
      },
    });
  } catch (error) {
    logger.error('获取仓库详情失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取仓库详情失败' });
  }
};

export const createRepository = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createRepositorySchema.parse(req.body);

    const hasAccess = await checkProjectAccess(body.projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权在该项目中创建仓库' });
      return;
    }

    const repository = await prisma.repository.create({
      data: {
        projectId: body.projectId,
        name: body.name,
        url: body.url,
        provider: body.provider,
        branch: body.branch,
      },
    });

    res.status(201).json({ repository });

    invalidateCache(`repos:project:${body.projectId}`).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建仓库失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建仓库失败' });
  }
};

export const updateRepository = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = updateRepositorySchema.parse(req.body);

    const repository = await prisma.repository.findUnique({
      where: { id },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const isOwner = await checkProjectOwner(repository.projectId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: '无权修改仓库' });
      return;
    }

    const updatedRepository = await prisma.repository.update({
      where: { id },
      data: body,
    });

    res.json({ repository: updatedRepository });

    invalidateCache(`repos:project:${repository.projectId}`).catch(() => {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新仓库失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新仓库失败' });
  }
};

export const deleteRepository = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const isOwner = await checkProjectOwner(repository.projectId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: '无权删除仓库' });
      return;
    }

    await prisma.repository.delete({
      where: { id },
    });

    res.json({ success: true });

    invalidateCache(`repos:project:${repository.projectId}`).catch(() => {});
  } catch (error) {
    logger.error('删除仓库失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除仓库失败' });
  }
};

export const getBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const hasAccess = await checkProjectAccess(repository.projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权访问该仓库' });
      return;
    }

    const branches = await prisma.commit.findMany({
      where: { repositoryId: id },
      distinct: ['branch'],
      select: { branch: true },
    });

    res.json({ branches: branches.map((b: { branch: string }) => b.branch) });
  } catch (error) {
    logger.error('获取分支列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取分支列表失败' });
  }
};

export const getCommits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { branch } = req.query;

    const repository = await prisma.repository.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const hasAccess = await checkProjectAccess(repository.projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权访问该仓库' });
      return;
    }

    const where: any = { repositoryId: id };
    if (branch && typeof branch === 'string') {
      where.branch = branch;
    }

    const commits = await prisma.commit.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json({ commits });
  } catch (error) {
    logger.error('获取提交记录失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取提交记录失败' });
  }
};

export const createCommit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = createCommitSchema.parse(req.body);

    const repository = await prisma.repository.findUnique({
      where: { id },
    });

    if (!repository) {
      res.status(404).json({ error: '仓库不存在' });
      return;
    }

    const hasAccess = await checkProjectAccess(repository.projectId, req.userId!);
    if (!hasAccess) {
      res.status(403).json({ error: '无权在该仓库中创建提交' });
      return;
    }

    const commit = await prisma.commit.create({
      data: {
        repositoryId: id,
        hash: body.hash,
        message: body.message,
        authorId: req.userId!,
        branch: body.branch,
      },
    });

    res.status(201).json({ commit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建提交失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建提交失败' });
  }
};
