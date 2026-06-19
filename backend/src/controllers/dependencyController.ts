import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { hasProjectAccess } from '../lib/projectAccess';

export const addDependency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { dependsOnId, type } = req.body;

    if (!dependsOnId) {
      res.status(400).json({ error: '缺少依赖任务 ID' });
      return;
    }

    if (taskId === dependsOnId) {
      res.status(400).json({ error: '任务不能依赖自身' });
      return;
    }

    const [sourceTask, targetTask] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true } }),
      prisma.task.findUnique({ where: { id: dependsOnId }, select: { id: true, projectId: true } }),
    ]);

    if (!sourceTask || !targetTask) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    // 授权检查：用户必须有项目访问权限
    if (!(await hasProjectAccess(req.userId!, sourceTask.projectId))) {
      res.status(403).json({ error: '无权操作此任务' });
      return;
    }

    if (sourceTask.projectId !== targetTask.projectId) {
      res.status(400).json({ error: '只能在同一项目中创建任务依赖' });
      return;
    }

    const existing = await prisma.taskDependency.findUnique({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });

    if (existing) {
      res.status(409).json({ error: '该依赖关系已存在' });
      return;
    }

    // Prevent circular dependencies within a transaction to avoid TOCTOU
    const dependency = await prisma.$transaction(async (tx: typeof prisma) => {
      const existingInTx = await tx.taskDependency.findUnique({
        where: { taskId_dependsOnId: { taskId, dependsOnId } },
      });
      if (existingInTx) {
        throw new Error('DUPLICATE_DEPENDENCY');
      }

      const hasCycle = await checkCircularDependencyInTx(tx, taskId, dependsOnId);
      if (hasCycle) {
        throw new Error('CIRCULAR_DEPENDENCY');
      }

      return await tx.taskDependency.create({
        data: {
          taskId,
          dependsOnId,
          type: type || 'blocks',
        },
        include: {
          dependsOn: {
            select: { id: true, title: true, status: true },
          },
        },
      });
    });

    res.status(201).json({ dependency });
  } catch (error: any) {
    if (error?.message === 'DUPLICATE_DEPENDENCY') {
      res.status(409).json({ error: '该依赖关系已存在' });
      return;
    }
    if (error?.message === 'CIRCULAR_DEPENDENCY') {
      res.status(400).json({ error: '无法创建循环依赖' });
      return;
    }
    logger.error('添加任务依赖失败', { error, taskId: req.params.taskId });
    res.status(500).json({ error: '添加任务依赖失败' });
  }
};

export const removeDependency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId, dependsOnId } = req.params;

    // 授权检查
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    if (!(await hasProjectAccess(req.userId!, task.projectId))) {
      res.status(403).json({ error: '无权操作此任务' });
      return;
    }

    const dependency = await prisma.taskDependency.findUnique({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });

    if (!dependency) {
      res.status(404).json({ error: '依赖关系不存在' });
      return;
    }

    await prisma.taskDependency.delete({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });

    res.json({ message: '依赖关系已移除' });
  } catch (error) {
    logger.error('移除任务依赖失败', { error, taskId: req.params.taskId });
    res.status(500).json({ error: '移除任务依赖失败' });
  }
};

export const getDependencies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const taskCheck = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!taskCheck) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    // 授权检查：用户必须有项目访问权限
    if (!(await hasProjectAccess(req.userId!, taskCheck.projectId))) {
      res.status(403).json({ error: '无权访问此任务' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        dependsOn: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true, priority: true },
            },
          },
        },
        dependedBy: {
          include: {
            task: {
              select: { id: true, title: true, status: true, priority: true },
            },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    res.json({
      dependsOn: task.dependsOn.map((d: any) => ({
        id: d.id,
        type: d.type,
        task: d.dependsOn,
      })),
      dependedBy: task.dependedBy.map((d: any) => ({
        id: d.id,
        type: d.type,
        task: d.task,
      })),
    });
  } catch (error) {
    logger.error('获取任务依赖失败', { error, taskId: req.params.taskId });
    res.status(500).json({ error: '获取任务依赖失败' });
  }
};

async function checkCircularDependencyInTx(tx: any, taskId: string, dependsOnId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [dependsOnId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === taskId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const deps = await tx.taskDependency.findMany({
      where: { taskId: currentId },
      select: { dependsOnId: true },
    });
    deps.forEach((d: { dependsOnId: string }) => queue.push(d.dependsOnId));
  }

  return false;
}
