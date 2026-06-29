import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const createFileSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  path: z.string(),
  type: z.enum(['FILE', 'DIRECTORY']),
  parentId: z.string().optional().nullable(),
  language: z.string().optional(),
  content: z.string().optional(),
});

async function collectDescendantIds(projectId: string, rootId: string): Promise<string[]> {
  const allFiles = await prisma.codeFile.findMany({
    where: { projectId },
    select: { id: true, parentId: true },
  });

  const childrenMap = new Map<string, string[]>();
  for (const f of allFiles) {
    if (f.parentId) {
      const list = childrenMap.get(f.parentId) || [];
      list.push(f.id);
      childrenMap.set(f.parentId, list);
    }
  }

  const result: string[] = [rootId];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const children = childrenMap.get(id) || [];
    for (const childId of children) {
      result.push(childId);
      stack.push(childId);
    }
  }

  return result;
}

export const createFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createFileSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { ownerId: true },
    });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    if (project.ownerId !== req.userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: body.projectId, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权在此项目中创建文件' });
        return;
      }
    }

    if (body.parentId) {
      const parent = await prisma.codeFile.findUnique({
        where: { id: body.parentId },
        select: { projectId: true },
      });
      if (!parent || parent.projectId !== body.projectId) {
        res.status(400).json({ error: '父目录不属于此项目' });
        return;
      }
    }

    const file = await prisma.codeFile.create({
      data: body,
    });

    res.status(201).json({ file });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建文件失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建文件失败' });
  }
};

export const updateFileName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: '文件名不能为空' });
      return;
    }

    const existing = await prisma.codeFile.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    // 权限检查：项目所有者或成员可以修改文件
    if (existing.project.ownerId !== req.userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: existing.projectId, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权修改此文件' });
        return;
      }
    }

    const file = await prisma.codeFile.update({
      where: { id },
      data: { name },
    });

    res.json({ file });
  } catch (error) {
    logger.error('更新文件名失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新文件名失败' });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.codeFile.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    // 权限检查：项目所有者或成员可以删除文件
    if (existing.project.ownerId !== req.userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: existing.projectId, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权删除此文件' });
        return;
      }
    }

    const idsToDelete = await collectDescendantIds(existing.projectId, id);

    await prisma.codeFile.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除文件失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除文件失败' });
  }
};
