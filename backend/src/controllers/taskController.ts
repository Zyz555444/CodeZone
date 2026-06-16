import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createAndPushNotification } from '../lib/notificationService';

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, '任务标题不能为空'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;

    const where: any = {
      project: {
        OR: [
          { ownerId: req.userId },
          {
            members: {
              some: { userId: req.userId },
            },
          },
        ],
      },
    };

    if (projectId) {
      where.projectId = projectId as string;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, username: true, avatar: true },
        },
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: {
            comments: true,
            subtasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (error) {
    logger.error('获取任务列表失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取任务列表失败' });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        ...body,
        creatorId: req.userId!,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: {
        assignee: {
          select: { id: true, username: true, avatar: true },
        },
        creator: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    await prisma.activity.create({
      data: {
        projectId: body.projectId,
        userId: req.userId!,
        type: 'task_created',
        content: `创建了任务 "${task.title}"`,
        metadata: { taskId: task.id },
      },
    });

    res.status(201).json({ task });

    if (body.assigneeId && body.assigneeId !== req.userId) {
      createAndPushNotification(
        body.assigneeId,
        '新任务分配',
        `你被分配了任务 "${task.title}"`,
        'TASK'
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('创建任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '创建任务失败' });
  }
};

export const getTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, username: true, avatar: true },
        },
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    res.json({ task });
  } catch (error) {
    logger.error('获取任务详情失败', { error, userId: req.userId });
    res.status(500).json({ error: '获取任务详情失败' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    // 权限检查：任务创建者或项目所有者可以更新
    if (task.creatorId !== req.userId && task.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权修改此任务' });
      return;
    }

    // 仅在从非DONE状态转为DONE时设置completedAt，其他状态变更保留原值
    const wasDoneTask = task.status === 'DONE';
    const willBeDone = status === 'DONE';
    let completedAtValue = undefined;
    if (willBeDone && !wasDoneTask) {
      completedAtValue = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        ...(completedAtValue !== undefined ? { completedAt: completedAtValue } : {}),
      },
    });

    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        userId: req.userId!,
        type: 'task_updated',
        content: `更新了任务 "${updatedTask.title}"`,
        metadata: { taskId: updatedTask.id },
      },
    });

    res.json({ task: updatedTask });

    if (assigneeId && assigneeId !== task.assigneeId && assigneeId !== req.userId) {
      createAndPushNotification(
        assigneeId,
        '任务分配更新',
        `你被分配了任务 "${updatedTask.title}"`,
        'TASK'
      );
    }
  } catch (error) {
    logger.error('更新任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '更新任务失败' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    // 权限检查：任务创建者或项目所有者可以删除
    if (task.creatorId !== req.userId && task.project.ownerId !== req.userId) {
      res.status(403).json({ error: '无权删除此任务' });
      return;
    }

    await prisma.task.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('删除任务失败', { error, userId: req.userId });
    res.status(500).json({ error: '删除任务失败' });
  }
};
