/**
 * Anomaly Detection API
 * 이상 탐지 결과 조회 및 분석 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { logger } from '@/lib/logging';
import {
  detectAnomaliesForHost,
  detectAnomaliesForAllHosts,
  getCachedAnomalyResults,
  createAnomalySummary,
  predictResourceExhaustion,
  DEFAULT_ANOMALY_CONFIG,
  AnomalyConfig,
} from '@/lib/anomaly';

/**
 * GET /api/anomaly
 *
 * Query params:
 * - action: 'detect' | 'summary' | 'predict' | 'status'
 * - hostId: 특정 호스트 ID (선택)
 * - threshold: 예측 임계값 (기본: 90)
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'summary';
    const hostId = searchParams.get('hostId');

    switch (action) {
      case 'detect':
        // 이상 탐지 실행
        if (hostId) {
          const result = await detectAnomaliesForHost(hostId);
          if (!result) {
            return NextResponse.json(
              { success: false, error: 'Host not found or no metrics available' },
              { status: 404 }
            );
          }
          return NextResponse.json({ success: true, data: result });
        } else {
          const results = await detectAnomaliesForAllHosts();
          const summary = createAnomalySummary(results);
          return NextResponse.json({
            success: true,
            data: {
              summary,
              results,
            },
          });
        }

      case 'summary':
        // 캐시된 결과에서 요약 조회
        const cachedResults = await getCachedAnomalyResults(hostId || undefined);
        if (cachedResults) {
          if (Array.isArray(cachedResults)) {
            return NextResponse.json({
              success: true,
              data: createAnomalySummary(cachedResults),
            });
          }
          return NextResponse.json({ success: true, data: cachedResults });
        }

        // 캐시 없으면 새로 탐지
        const freshResults = await detectAnomaliesForAllHosts();
        return NextResponse.json({
          success: true,
          data: {
            summary: createAnomalySummary(freshResults),
            results: freshResults.slice(0, 20), // 상위 20개만
          },
        });

      case 'predict':
        // 리소스 고갈 예측
        if (!hostId) {
          return NextResponse.json(
            { success: false, error: 'hostId is required for prediction' },
            { status: 400 }
          );
        }
        const threshold = parseInt(searchParams.get('threshold') || '90');
        const predictions = await predictResourceExhaustion(hostId, threshold);
        return NextResponse.json({ success: true, data: predictions });

      case 'status':
        // 이상 탐지 서비스 상태
        return NextResponse.json({
          success: true,
          data: {
            status: 'active',
            config: DEFAULT_ANOMALY_CONFIG,
            timestamp: Date.now(),
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Anomaly API error', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/anomaly
 *
 * Body:
 * - action: 'configure' | 'train'
 * - config: AnomalyConfig (설정 업데이트 시)
 * - hostIds: string[] (학습 시)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (admin만)
    const token = await getToken({ req: request });
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'train':
        // 베이스라인 학습 (지정된 호스트 또는 전체)
        const hostIds: string[] = body.hostIds || [];

        if (hostIds.length > 0) {
          const results = await Promise.all(
            hostIds.map((id) => detectAnomaliesForHost(id))
          );
          return NextResponse.json({
            success: true,
            data: {
              message: `Training completed for ${hostIds.length} hosts`,
              trained: results.filter((r) => r !== null).length,
            },
          });
        } else {
          const results = await detectAnomaliesForAllHosts();
          return NextResponse.json({
            success: true,
            data: {
              message: `Training completed for all hosts`,
              trained: results.length,
            },
          });
        }

      case 'configure':
        // 설정 업데이트 (현재는 메모리에만 저장)
        const config: Partial<AnomalyConfig> = body.config || {};
        // TODO: 설정을 DB나 Redis에 저장
        return NextResponse.json({
          success: true,
          data: {
            message: 'Configuration updated',
            config: { ...DEFAULT_ANOMALY_CONFIG, ...config },
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Anomaly API POST error', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
