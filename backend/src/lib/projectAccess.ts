import { prisma } from './prisma';

/**
 * 获取用户有权限访问的所有项目 ID 列表
 * 用户在以下情况有访问权限：
 * 1. 是项目的 owner
 * 2. 是项目的 member
 */
export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return projects.map((p: { id: string }) => p.id);
}

/**
 * 检查用户是否有权限访问指定项目
 */
export async function hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return project !== null;
}
