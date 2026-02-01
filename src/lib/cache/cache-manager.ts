/**
 * Cache Manager
 * Redis 우선, In-Memory 폴백 캐싱 시스템
 */

import { getRedisClient, isRedisConnected } from './redis-client';
import { logger } from '@/lib/logging';

// ============================================
// Cache Configuration
// ============================================
export const CACHE_TTL = {
  // 자주 변경되지 않는 데이터
  HOSTS: 5 * 60,           // 5분
  HOST_GROUPS: 10 * 60,    // 10분
  MEDIA_TYPES: 30 * 60,    // 30분
  ACTIONS: 30 * 60,        // 30분

  // 실시간 데이터
  PROBLEMS: 30,            // 30초
  TRIGGERS: 30,            // 30초
  STATS: 60,               // 1분
  SEVERITY_SUMMARY: 30,    // 30초

  // 리소스 데이터
  TOP_CPU: 60,             // 1분
  TOP_MEMORY: 60,          // 1분
  HTTP_TESTS: 60,          // 1분

  // 히스토리 데이터
  HISTORY: 5 * 60,         // 5분
  EVENTS: 2 * 60,          // 2분
  TRENDS: 30 * 60,         // 30분

  // 이상 탐지 데이터
  ANOMALY_BASELINE: 60 * 60, // 1시간
  ANOMALY_SCORES: 5 * 60,    // 5분
} as const;

export const CACHE_KEYS = {
  HOSTS: (groupId?: string) => `zabbix:hosts:${groupId || 'all'}`,
  HOST_GROUPS: 'zabbix:hostgroups',
  PROBLEMS: 'zabbix:problems',
  TRIGGERS: 'zabbix:triggers',
  STATS: 'zabbix:stats',
  SEVERITY_SUMMARY: 'zabbix:severity-summary',
  TOP_CPU: 'zabbix:top-cpu',
  TOP_MEMORY: 'zabbix:top-memory',
  HTTP_TESTS: 'zabbix:http-tests',
  MEDIA_TYPES: 'zabbix:media-types',
  ACTIONS: 'zabbix:actions',
  HISTORY: (itemId: string, from: string, to: string) => `zabbix:history:${itemId}:${from}:${to}`,
  EVENTS: (from: string, to: string) => `zabbix:events:${from}:${to}`,
  ANOMALY_BASELINE: (hostId: string, itemKey: string) => `anomaly:baseline:${hostId}:${itemKey}`,
  ANOMALY_SCORES: (hostId: string) => `anomaly:scores:${hostId}`,
} as const;

// ============================================
// In-Memory Cache (Fallback)
// ============================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// 5분마다 만료된 캐시 정리
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ============================================
// Cache Operations
// ============================================

/**
 * 캐시에서 데이터 조회
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    // Redis 시도
    if (isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        const data = await redis.get(key);
        if (data) {
          logger.debug(`Cache HIT (Redis): ${key}`);
          return JSON.parse(data) as T;
        }
      }
    }

    // In-Memory 폴백
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() < entry.expiresAt) {
      logger.debug(`Cache HIT (Memory): ${key}`);
      return entry.data;
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Cache get error: ${key}`, error);
    return null;
  }
}

/**
 * 캐시에 데이터 저장
 */
export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  try {
    const serialized = JSON.stringify(data);

    // Redis 저장
    if (isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.setex(key, ttlSeconds, serialized);
        logger.debug(`Cache SET (Redis): ${key}, TTL: ${ttlSeconds}s`);
      }
    }

    // In-Memory도 저장 (폴백용)
    memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch (error) {
    logger.error(`Cache set error: ${key}`, error);
  }
}

/**
 * 캐시 삭제
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    if (isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.del(key);
      }
    }
    memoryCache.delete(key);
    logger.debug(`Cache DELETE: ${key}`);
  } catch (error) {
    logger.error(`Cache delete error: ${key}`, error);
  }
}

/**
 * 패턴으로 캐시 삭제
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    // Redis에서 패턴 삭제
    if (isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    }

    // In-Memory에서 패턴 삭제
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
    logger.debug(`Cache DELETE PATTERN: ${pattern}`);
  } catch (error) {
    logger.error(`Cache delete pattern error: ${pattern}`, error);
  }
}

/**
 * 모든 Zabbix 캐시 무효화
 */
export async function invalidateZabbixCache(): Promise<void> {
  await cacheDeletePattern('zabbix:*');
  logger.info('All Zabbix cache invalidated');
}

/**
 * 캐시 통계
 */
export async function getCacheStats(): Promise<{
  redisConnected: boolean;
  memoryEntries: number;
  redisKeys?: number;
}> {
  const stats: {
    redisConnected: boolean;
    memoryEntries: number;
    redisKeys?: number;
  } = {
    redisConnected: isRedisConnected(),
    memoryEntries: memoryCache.size,
  };

  if (isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      const keys = await redis.keys('*');
      stats.redisKeys = keys.length;
    }
  }

  return stats;
}

// ============================================
// Cache Decorator (함수 래핑용)
// ============================================

/**
 * 함수 결과를 캐싱하는 래퍼
 */
export function withCache<T>(
  keyFn: (...args: unknown[]) => string,
  ttl: number
) {
  return function (
    fn: (...args: unknown[]) => Promise<T>
  ): (...args: unknown[]) => Promise<T> {
    return async (...args: unknown[]): Promise<T> => {
      const key = keyFn(...args);

      // 캐시 확인
      const cached = await cacheGet<T>(key);
      if (cached !== null) {
        return cached;
      }

      // 원본 함수 실행
      const result = await fn(...args);

      // 캐시 저장
      await cacheSet(key, result, ttl);

      return result;
    };
  };
}
