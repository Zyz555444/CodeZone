import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis: RedisClientType = createClient({ url: redisUrl });

redis.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redis.on('connect', () => {
  logger.info('Redis Client Connected');
});

redis.on('ready', () => {
  isConnected = true;
  logger.info('Redis Client Ready');
});

redis.on('end', () => {
  isConnected = false;
  logger.warn('Redis Client Disconnected');
});

redis.on('reconnecting', () => {
  isConnected = false;
  logger.warn('Redis Client Reconnecting');
});

let isConnected = false;

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.isOpen) {
    await redis.disconnect();
  }
}

export function isRedisConnected(): boolean {
  return isConnected && redis.isOpen;
}

export function getRedisClient(): RedisClientType {
  return redis;
}

export { redis };
