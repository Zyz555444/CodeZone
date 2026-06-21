import { getRedisClient, isRedisConnected } from './redis';
import { logger } from '../utils/logger';

const DEFAULT_TTL = 30; // 30 秒

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  if (isRedisConnected()) {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  }

  const data = await fetchFn();

  if (isRedisConnected()) {
    const redis = getRedisClient();
    redis.set(key, JSON.stringify(data), { EX: ttl }).catch((err) => {
      logger.warn('缓存写入失败', { key, error: err });
    });
  }

  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  redis.del(key).catch((err) => {
    logger.warn('缓存失效失败', { key, error: err });
  });
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    redis.del(keys).catch((err) => {
      logger.warn('缓存批量失效失败', { pattern, error: err });
    });
  }
}
