import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

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
    throw error;
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

    res.status(201).json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    throw error;
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
    throw error;
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
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
        completedAt: status === 'DONE' ? new Date() : null,
      },
    });

    res.json({ task: updatedTask });
  } catch (error) {
    throw error;
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    throw error;
  }
};
