import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const createSubTaskSchema = z.object({
  title: z.string().min(1, '子任务标题不能为空'),
});

const updateSubTaskSchema = z.object({
  title: z.string().min(1, '子任务标题不能为空').optional(),
  completed: z.boolean().optional(),
});

export const createSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { title } = createSubTaskSchema.parse(req.body);

    // 验证任务存在且用户有权限
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { ownerId: true } } },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    if (task.creatorId !== req.userId && task.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权操作此任务' });
      return;
    }

    const subTask = await prisma.subTask.create({
      data: {
        taskId,
        title,
      },
    });

    res.status(201).json({ subTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建子任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建子任务失败' });
  }
};

export const updateSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, completed } = updateSubTaskSchema.parse(req.body);

    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: { task: { include: { project: { select: { ownerId: true } } } } },
    });

    if (!subTask) {
      res.status(404).json({ error: '子任务不存在' });
      return;
    }

    if (subTask.task.creatorId !== req.userId && subTask.task.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权操作此子任务' });
      return;
    }

    const updated = await prisma.subTask.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(completed !== undefined ? { completed } : {}),
      },
    });

    res.json({ subTask: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('更新子任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新子任务失败' });
  }
};

export const deleteSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: { task: { include: { project: { select: { ownerId: true } } } } },
    });

    if (!subTask) {
      res.status(404).json({ error: '子任务不存在' });
      return;
    }

    if (subTask.task.creatorId !== req.userId && subTask.task.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权操作此子任务' });
      return;
    }

    await prisma.subTask.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除子任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除子任务失败' });
  }
};
