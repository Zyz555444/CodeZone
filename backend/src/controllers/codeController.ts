import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

function buildFileTree(files: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const file of files) {
    map.set(file.id, { ...file, children: [] });
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

export const getFilesTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const allFiles = await prisma.codeFile.findMany({
      where: { projectId: projectId as string },
      orderBy: { name: 'asc' },
    });

    const tree = buildFileTree(allFiles);

    res.json({ files: tree });
  } catch (error) {
    res.status(500).json({ error: '获取文件树失败' });
  }
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.codeFile.findUnique({
      where: { id },
    });

    if (!file) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    res.json({ file });
  } catch (error) {
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

    // 权限检查：项目所有者可以更新文件
    if (existing.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权更新此文件' });
      return;
    }

    const file = await prisma.codeFile.update({
      where: { id },
      data: { content },
    });

    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: '更新文件失败' });
  }
};

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, parentId } = req.query;

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
    res.status(500).json({ error: '获取文件列表失败' });
  }
};
