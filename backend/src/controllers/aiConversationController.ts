import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().optional(),
  modelId: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200),
});

export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      res.status(400).json({ error: 'projectId query parameter is required' });
      return;
    }

    const conversations = await prisma.aIConversation.findMany({
      where: { projectId, userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        modelId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    res.json({ conversations });
  } catch (error) {
    logger.error('获取对话列表失败', { error });
    res.status(500).json({ error: '获取对话列表失败' });
  }
}

export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId, title, modelId } = createSchema.parse(req.body);

    const conversation = await prisma.aIConversation.create({
      data: {
        projectId,
        userId: req.userId!,
        title: title || '新对话',
        modelId: modelId || null,
      },
    });

    res.status(201).json({ conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    logger.error('创建对话失败', { error });
    res.status(500).json({ error: '创建对话失败' });
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const conversation = await prisma.aIConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            toolCalls: true,
            tokenCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }

    if (conversation.userId !== req.userId) {
      res.status(403).json({ error: '无权访问此对话' });
      return;
    }

    res.json({ conversation });
  } catch (error) {
    logger.error('获取对话失败', { error });
    res.status(500).json({ error: '获取对话失败' });
  }
}

export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const conversation = await prisma.aIConversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }

    if (conversation.userId !== req.userId) {
      res.status(403).json({ error: '无权删除此对话' });
      return;
    }

    await prisma.aIConversation.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除对话失败', { error });
    res.status(500).json({ error: '删除对话失败' });
  }
}

export async function updateConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title } = updateSchema.parse(req.body);

    const conversation = await prisma.aIConversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }

    if (conversation.userId !== req.userId) {
      res.status(403).json({ error: '无权修改此对话' });
      return;
    }

    const updated = await prisma.aIConversation.update({
      where: { id },
      data: { title },
    });

    res.json({ conversation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    logger.error('更新对话失败', { error });
    res.status(500).json({ error: '更新对话失败' });
  }
}
