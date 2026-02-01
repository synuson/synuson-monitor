/**
 * Redis Client Singleton
 * Redis 연결 관리 및 폴백 처리
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logging';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

/**
 * Redis 클라이언트 초기화
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return isRedisAvailable ? redisClient : null;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured, using in-memory cache');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          isRedisAvailable = false;
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      logger.error('Redis connection error', err);
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
      logger.warn('Redis connection closed');
    });

    // 연결 시도
    redisClient.connect().catch(() => {
      isRedisAvailable = false;
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client', error);
    return null;
  }
}

/**
 * Redis 연결 상태 확인
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Redis 연결 종료
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}
