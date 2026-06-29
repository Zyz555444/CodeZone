import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../lib/projectAccess';
import { logger } from '../utils/logger';

const MAX_FILES_PER_PROJECT = 5000;

interface FileNode {
  id: string;
  children: FileNode[];
  [key: string]: unknown;
}

function buildFileTree(files: { id: string; parentId: string | null; [key: string]: unknown }[]): FileNode[] {
  const map = new Map<string, FileNode>();
  const roots: FileNode[] = [];

  for (const file of files) {
    map.set(file.id, { ...file, children: [] } as FileNode);
  }

  for (const file of files) {
    const node = map.get(file.id)!;
    if (file.parentId && map.has(file.parentId)) {
      map.get(file.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export const getFilesTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    if (!(await hasProjectAccess(req.userId!, projectId as string))) {
      res.status(403).json({ error: '无权访问此项目' });
      return;
    }

    const fileCount = await prisma.codeFile.count({
      where: { projectId: projectId as string },
    });
    if (fileCount > MAX_FILES_PER_PROJECT) {
      res.status(400).json({ error: `项目文件数超过限制 (${MAX_FILES_PER_PROJECT})` });
      return;
    }

    const allFiles = await prisma.codeFile.findMany({
      where: { projectId: projectId as string },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        path: true,
        type: true,
        parentId: true,
      },
    });

    const tree = buildFileTree(allFiles);

    res.json({ files: tree });
  } catch (error) {
    logger.error('获取文件树失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取文件树失败' });
  }
};

export const getFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.codeFile.findUnique({
      where: { id },
    });

    if (!file) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    if (!(await hasProjectAccess(req.userId!, file.projectId))) {
      res.status(403).json({ error: '无权访问此文件' });
      return;
    }

    res.json({ file });
  } catch (error) {
    logger.error('获取文件失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取文件失败' });
  }
};

export const updateFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const existing = await prisma.codeFile.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    // 权限检查：项目所有者或成员可以更新文件
    if (existing.project.ownerId !== req.userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: existing.projectId, userId: req.userId! } },
      });
      if (!membership) {
        res.status(403).json({ error: '无权更新此文件' });
        return;
      }
    }

    const file = await prisma.codeFile.update({
      where: { id },
      data: { content },
    });

    res.json({ file });
  } catch (error) {
    logger.error('更新文件失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新文件失败' });
  }
};

export const getFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, parentId } = req.query;

    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    if (!(await hasProjectAccess(req.userId!, projectId as string))) {
      res.status(403).json({ error: '无权访问此项目' });
      return;
    }

    const where: any = {
      projectId: projectId as string,
    };

    if (parentId) {
      where.parentId = parentId;
    }

    const files = await prisma.codeFile.findMany({
      where,
      select: {
        id: true,
        name: true,
        path: true,
        type: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ files });
  } catch (error) {
    logger.error('获取文件列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取文件列表失败' });
  }
};
