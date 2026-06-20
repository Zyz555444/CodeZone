import { prisma } from './prisma';
import { getRedisClient, isRedisConnected } from './redis';

const PROJECT_ACCESS_CACHE_TTL = 300; // 5 分钟

export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  // 优先从 Redis 缓存读取
  if (isRedisConnected()) {
    const redis = getRedisClient();
    const cached = await redis.get(`accessible-projects:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  const projectIds = projects.map((p: { id: string }) => p.id);

  // 回写缓存
  if (isRedisConnected()) {
    const redis = getRedisClient();
    await redis.set(
      `accessible-projects:${userId}`,
      JSON.stringify(projectIds),
      { EX: PROJECT_ACCESS_CACHE_TTL }
    );
  }

  return projectIds;
}

export async function invalidateProjectAccessCache(userIds: string[]): Promise<void> {
  if (!isRedisConnected() || userIds.length === 0) return;
  const redis = getRedisClient();
  const keys = userIds.map((uid) => `accessible-projects:${uid}`);
  await redis.del(keys);
}

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
