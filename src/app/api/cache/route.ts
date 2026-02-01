/**
 * Cache Status API
 * 캐시 상태 조회 및 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getCacheStats,
  invalidateZabbixCache,
  cacheDeletePattern,
} from '@/lib/cache';
import { logger } from '@/lib/logging';

/**
 * GET /api/cache
 * 캐시 상태 조회
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Cache stats error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache
 * 캐시 무효화
 *
 * Query params:
 * - pattern: 삭제할 키 패턴 (예: 'zabbix:*', 'anomaly:*')
 * - all: 'true'이면 전체 Zabbix 캐시 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pattern = searchParams.get('pattern');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await invalidateZabbixCache();
      logger.info('All Zabbix cache invalidated by admin');
      return NextResponse.json({
        success: true,
        message: 'All Zabbix cache invalidated',
      });
    }

    if (pattern) {
      await cacheDeletePattern(pattern);
      logger.info(`Cache pattern "${pattern}" deleted by admin`);
      return NextResponse.json({
        success: true,
        message: `Cache pattern "${pattern}" deleted`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Specify pattern or all=true' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Cache delete error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cache' },
      { status: 500 }
    );
  }
}
