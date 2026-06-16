import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();

    if (!q) {
      res.json({ projects: [], tasks: [], users: [], files: [] });
      return;
    }

    const userId = req.userId!;

    const accessibleProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const projectIds = accessibleProjects.map((p: { id: string }) => p.id);

    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = userTeams.map((t: { teamId: string }) => t.teamId);

    const membersInTeams = await prisma.teamMember.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    });
    const memberIds = [...new Set(membersInTeams.map((m: { userId: string }) => m.userId))];

    const queryFilter = { contains: q, mode: 'insensitive' as const };

    const [projects, tasks, users, files] = await Promise.all([
      prisma.project.findMany({
        where: {
          id: { in: projectIds },
          name: queryFilter,
        },
        select: { id: true, name: true },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          title: queryFilter,
        },
        select: { id: true, title: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          id: { in: memberIds },
          username: queryFilter,
        },
        select: { id: true, username: true, avatar: true },
        take: 5,
      }),
      prisma.codeFile.findMany({
        where: {
          projectId: { in: projectIds },
          name: queryFilter,
          type: 'FILE',
        },
        select: { id: true, name: true, projectId: true },
        take: 5,
      }),
    ]);

    res.json({
      projects: projects.map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
        link: `/projects/${p.id}`,
        type: 'project',
      })),
      tasks: tasks.map((t: { id: string; title: string }) => ({
        id: t.id,
        title: t.title,
        link: `/tasks/${t.id}`,
        type: 'task',
      })),
      users: users.map((u: { id: string; username: string; avatar: string | null }) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        link: `/profile`,
        type: 'user',
      })),
      files: files.map((f: { id: string; name: string; projectId: string }) => ({
        id: f.id,
        name: f.name,
        link: `/projects/${f.projectId}/files/${f.id}`,
        type: 'file',
      })),
    });
  } catch (error) {
    logger.error('搜索失败', { error, userId: req.userId });
    res.status(500).json({ error: '搜索失败' });
  }
};
