import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const createFileSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  path: z.string(),
  type: z.enum(['FILE', 'DIRECTORY']),
  parentId: z.string().optional().nullable(),
  language: z.string().optional(),
  content: z.string().optional(),
});

async function deleteFileRecursive(id: string): Promise<void> {
  const children = await prisma.codeFile.findMany({
    where: { parentId: id },
  });

  for (const child of children) {
    if (child.type === 'DIRECTORY') {
      await deleteFileRecursive(child.id);
    } else {
      await prisma.codeFile.delete({ where: { id: child.id } });
    }
  }

  await prisma.codeFile.delete({ where: { id } });
}

export const createFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createFileSchema.parse(req.body);

    const file = await prisma.codeFile.create({
      data: body,
    });

    res.status(201).json({ file });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
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

    const existing = await prisma.codeFile.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    const file = await prisma.codeFile.update({
      where: { id },
      data: { name },
    });

    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: '更新文件名失败' });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.codeFile.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    await deleteFileRecursive(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除文件失败' });
  }
};
