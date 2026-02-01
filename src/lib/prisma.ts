import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * PostgreSQL 커넥션 풀 생성
 */
function createPool(): Pool {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }

  return pool;
}

/**
 * Prisma Client 싱글톤
 * Prisma 7 - PostgreSQL 어댑터 사용
 */
function createPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const pool = createPool();
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = createPrismaClient();

export default prisma;
