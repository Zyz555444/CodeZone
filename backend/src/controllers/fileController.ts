import { Request, Response } from 'express';
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
    throw error;
  }
};

export const updateFileName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const file = await prisma.codeFile.update({
      where: { id },
      data: { name },
    });

    res.json({ file });
  } catch (error) {
    throw error;
  }
};

export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.codeFile.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    throw error;
  }
};
