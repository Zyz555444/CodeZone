import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getFilesTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      res.status(400).json({ error: '项目 ID 不能为空' });
      return;
    }

    const files = await prisma.codeFile.findMany({
      where: {
        projectId: projectId as string,
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ files });
  } catch (error) {
    throw error;
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
    throw error;
  }
};

export const updateFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const file = await prisma.codeFile.update({
      where: { id },
      data: { content },
    });

    res.json({ file });
  } catch (error) {
    throw error;
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
    throw error;
  }
};
