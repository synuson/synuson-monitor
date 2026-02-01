/**
 * Rate Limiter with Redis Support
 * 프로덕션: Redis 사용 권장
 * 개발: In-Memory 사용
 */

export interface RateLimitConfig {
  max: number;           // 최대 요청 수
  window: number;        // 윈도우 (ms)
  blockDuration?: number; // 차단 기간 (ms)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  blocked?: boolean;
  retryAfter?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockedUntil?: number;
}

// ============================================
// In-Memory Rate Limiter (개발/단일 인스턴스용)
// ============================================
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 5분마다 만료된 레코드 정리
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(identifier);

    // 차단 상태 확인 (bruteforce 방어)
    if (record?.blocked && record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        blocked: true,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
      };
    }

    // 윈도우 만료 시 리셋
    if (!record || now > record.resetTime) {
      this.store.set(identifier, { count: 1, resetTime: now + config.window });
      return { allowed: true, remaining: config.max - 1 };
    }

    // 제한 초과 확인
    if (record.count >= config.max) {
      if (config.blockDuration) {
        record.blocked = true;
        record.blockedUntil = now + config.blockDuration;
        this.store.set(identifier, record);
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count++;
    this.store.set(identifier, record);
    return { allowed: true, remaining: config.max - record.count };
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime && (!record.blockedUntil || now > record.blockedUntil)) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// ============================================
// Redis Rate Limiter (프로덕션용)
// ============================================
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

class RedisRateLimiter {
  private redis: RedisClient;
  private prefix: string;

  constructor(redis: RedisClient, prefix = 'ratelimit:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = `${this.prefix}${identifier}`;
    const blockKey = `${this.prefix}block:${identifier}`;
    const now = Date.now();

    // 차단 상태 확인
    const blockedUntil = await this.redis.get(blockKey);
    if (blockedUntil) {
      const blockedTime = parseInt(blockedUntil);
      if (now < blockedTime) {
        return {
          allowed: false,
          remaining: 0,
          blocked: true,
          retryAfter: Math.ceil((blockedTime - now) / 1000),
        };
      }
      await this.redis.del(blockKey);
    }

    // 현재 카운트 확인
    const current = await this.redis.get(key);

    if (!current) {
      // 새 윈도우 시작
      await this.redis.set(key, '1', { EX: Math.ceil(config.window / 1000) });
      return { allowed: true, remaining: config.max - 1 };
    }

    const count = parseInt(current);

    if (count >= config.max) {
      // 차단 설정
      if (config.blockDuration) {
        await this.redis.set(
          blockKey,
          String(now + config.blockDuration),
          { EX: Math.ceil(config.blockDuration / 1000) }
        );
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(config.window / 1000),
      };
    }

    await this.redis.incr(key);
    return { allowed: true, remaining: config.max - count - 1 };
  }

  async reset(identifier: string): Promise<void> {
    const key = `${this.prefix}${identifier}`;
    const blockKey = `${this.prefix}block:${identifier}`;
    await this.redis.del(key);
    await this.redis.del(blockKey);
  }
}

// ============================================
// Factory & Singleton
// ============================================
let rateLimiterInstance: InMemoryRateLimiter | null = null;

export function getRateLimiter(): InMemoryRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new InMemoryRateLimiter();
  }
  return rateLimiterInstance;
}

export function createRedisRateLimiter(redis: RedisClient): RedisRateLimiter {
  return new RedisRateLimiter(redis);
}

// 기본 설정 내보내기
export const RATE_LIMIT_CONFIGS = {
  general: { max: 100, window: 60 * 1000 },
  auth: { max: 5, window: 60 * 1000, blockDuration: 15 * 60 * 1000 },
  api: { max: 60, window: 60 * 1000 },
  sensitive: { max: 10, window: 60 * 1000, blockDuration: 30 * 60 * 1000 },
} as const;

export { InMemoryRateLimiter, RedisRateLimiter };
