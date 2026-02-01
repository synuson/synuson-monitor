/**
 * Anomaly Detection Service
 * Zabbix 메트릭 수집 및 이상 탐지 오케스트레이션
 */

import { ZabbixClient } from '@/lib/zabbix/client';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { logger } from '@/lib/logging';
import {
  MetricDataPoint,
  MetricBaseline,
  AnomalyScore,
  AnomalyDetectionResult,
  AnomalyConfig,
  DEFAULT_ANOMALY_CONFIG,
  MONITORED_METRICS,
} from './types';
import {
  createBaseline,
  getBaseline,
  saveBaseline,
  analyzeValue,
  aggregateAnomalies,
  analyzeTrend,
  detectSpikeOrDrop,
} from './detector';

// ============================================
// Zabbix 클라이언트
// ============================================

function getZabbixClient(): ZabbixClient {
  return new ZabbixClient({
    url: process.env.ZABBIX_URL || 'http://localhost:8080',
    user: process.env.ZABBIX_USER || 'Admin',
    password: process.env.ZABBIX_PASSWORD || 'zabbix',
  });
}

// ============================================
// 메트릭 수집
// ============================================

interface HostMetrics {
  hostId: string;
  hostName: string;
  metrics: {
    itemKey: string;
    itemName: string;
    lastValue: number;
    history: MetricDataPoint[];
  }[];
}

interface ZabbixHostResult {
  hostid: string;
  host: string;
  name: string;
}

interface ZabbixItemResult {
  itemid: string;
  key_: string;
  name: string;
  lastvalue: string;
  value_type: string;
}

interface ZabbixHistoryResult {
  clock: string;
  value: string;
}

/**
 * 호스트별 메트릭 수집
 */
export async function collectHostMetrics(
  hostId: string,
  timeRangeHours: number = 24
): Promise<HostMetrics | null> {
  const client = getZabbixClient();

  try {
    await client.login();

    // 호스트 정보 조회
    const hosts = await client.request<ZabbixHostResult[]>('host.get', {
      output: ['hostid', 'host', 'name'],
      hostids: [hostId],
    });

    if (!hosts || hosts.length === 0) {
      return null;
    }

    const host = hosts[0];
    const timeFrom = Math.floor(Date.now() / 1000) - timeRangeHours * 3600;

    // 모니터링 대상 아이템 조회
    const itemKeys = MONITORED_METRICS.map((m) => m.key);
    const items = await client.request<ZabbixItemResult[]>('item.get', {
      output: ['itemid', 'key_', 'name', 'lastvalue', 'value_type'],
      hostids: [hostId],
      search: { key_: itemKeys },
      searchByAny: true,
    });

    if (!items || items.length === 0) {
      return { hostId, hostName: host.name, metrics: [] };
    }

    // 각 아이템의 히스토리 수집
    const metricsPromises = items.map(async (item) => {
      try {
        const history = await client.request<ZabbixHistoryResult[]>('history.get', {
          output: ['clock', 'value'],
          itemids: [item.itemid],
          history: parseInt(item.value_type),
          time_from: timeFrom,
          sortfield: 'clock',
          sortorder: 'ASC',
          limit: 1000,
        });

        const dataPoints: MetricDataPoint[] = (history || []).map((h) => ({
          timestamp: parseInt(h.clock),
          value: parseFloat(h.value),
        }));

        return {
          itemKey: item.key_,
          itemName: item.name,
          lastValue: parseFloat(item.lastvalue),
          history: dataPoints,
        };
      } catch (error) {
        logger.error(`Failed to get history for item ${item.itemid}`, error);
        return null;
      }
    });

    const metricsResults = await Promise.all(metricsPromises);
    const validMetrics = metricsResults.filter((m): m is NonNullable<typeof m> => m !== null);

    await client.logout();

    return {
      hostId,
      hostName: host.name,
      metrics: validMetrics,
    };
  } catch (error) {
    logger.error('Failed to collect host metrics', error);
    try {
      await client.logout();
    } catch { /* ignore */ }
    return null;
  }
}

// ============================================
// 이상 탐지 실행
// ============================================

/**
 * 단일 호스트 이상 탐지
 */
export async function detectAnomaliesForHost(
  hostId: string,
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Promise<AnomalyDetectionResult | null> {
  try {
    // 메트릭 수집
    const hostMetrics = await collectHostMetrics(hostId, config.baselineWindowHours);
    if (!hostMetrics || hostMetrics.metrics.length === 0) {
      return null;
    }

    const anomalyScores: AnomalyScore[] = [];

    // 각 메트릭 분석
    for (const metric of hostMetrics.metrics) {
      // 기존 베이스라인 조회
      let baseline = await getBaseline(hostId, metric.itemKey);

      // 베이스라인 업데이트/생성
      baseline = createBaseline(
        hostId,
        metric.itemKey,
        metric.itemName,
        metric.history,
        baseline || undefined
      );

      // 충분한 샘플이 있는 경우에만 분석
      if (baseline.sampleCount >= config.minSampleCount) {
        const score = analyzeValue(metric.lastValue, baseline, config);
        score.hostName = hostMetrics.hostName;
        anomalyScores.push(score);
      }

      // 베이스라인 저장
      await saveBaseline(baseline);
    }

    // 결과 집계
    const result = aggregateAnomalies(hostId, hostMetrics.hostName, anomalyScores);

    // 캐시에 저장
    await cacheSet(
      CACHE_KEYS.ANOMALY_SCORES(hostId),
      result,
      CACHE_TTL.ANOMALY_SCORES
    );

    return result;
  } catch (error) {
    logger.error(`Anomaly detection failed for host ${hostId}`, error);
    return null;
  }
}

/**
 * 모든 호스트 이상 탐지
 */
export async function detectAnomaliesForAllHosts(
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Promise<AnomalyDetectionResult[]> {
  const client = getZabbixClient();
  const results: AnomalyDetectionResult[] = [];

  try {
    await client.login();

    // 모든 활성 호스트 조회
    const hosts = await client.request<ZabbixHostResult[]>('host.get', {
      output: ['hostid', 'host', 'name'],
      filter: { status: 0 }, // enabled hosts only
    });

    await client.logout();

    if (!hosts || hosts.length === 0) {
      return [];
    }

    // 병렬 처리 (최대 5개 동시)
    const batchSize = 5;
    for (let i = 0; i < hosts.length; i += batchSize) {
      const batch = hosts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((host) => detectAnomaliesForHost(host.hostid, config))
      );
      results.push(...batchResults.filter((r): r is AnomalyDetectionResult => r !== null));
    }

    // 점수순 정렬
    results.sort((a, b) => b.totalScore - a.totalScore);

    logger.info(`Anomaly detection completed for ${hosts.length} hosts, ${results.length} with results`);

    return results;
  } catch (error) {
    logger.error('Failed to detect anomalies for all hosts', error);
    try {
      await client.logout();
    } catch { /* ignore */ }
    return [];
  }
}

// ============================================
// 캐시된 결과 조회
// ============================================

/**
 * 캐시된 이상 탐지 결과 조회
 */
export async function getCachedAnomalyResults(
  hostId?: string
): Promise<AnomalyDetectionResult | AnomalyDetectionResult[] | null> {
  if (hostId) {
    return cacheGet<AnomalyDetectionResult>(CACHE_KEYS.ANOMALY_SCORES(hostId));
  }

  // 전체 호스트 결과는 별도 캐시 키 필요
  // 여기서는 단순히 null 반환
  return null;
}

// ============================================
// 요약 통계
// ============================================

export interface AnomalySummary {
  totalHosts: number;
  hostsWithAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topAnomalies: AnomalyScore[];
  timestamp: number;
}

/**
 * 이상 탐지 요약 생성
 */
export function createAnomalySummary(results: AnomalyDetectionResult[]): AnomalySummary {
  const allAnomalies: AnomalyScore[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  results.forEach((result) => {
    result.anomalies.forEach((anomaly) => {
      allAnomalies.push(anomaly);
      switch (anomaly.severity) {
        case 'critical':
          criticalCount++;
          break;
        case 'high':
          highCount++;
          break;
        case 'medium':
          mediumCount++;
          break;
        case 'low':
          lowCount++;
          break;
      }
    });
  });

  // 점수순 정렬 후 상위 10개
  const topAnomalies = allAnomalies
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 10);

  return {
    totalHosts: results.length,
    hostsWithAnomalies: results.filter((r) => r.anomalies.length > 0).length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    topAnomalies,
    timestamp: Date.now(),
  };
}

// ============================================
// 트렌드 기반 예측
// ============================================

export interface TrendPrediction {
  hostId: string;
  hostName: string;
  itemKey: string;
  itemName: string;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  predictedValue24h: number;
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

/**
 * 리소스 고갈 예측
 */
export async function predictResourceExhaustion(
  hostId: string,
  threshold: number = 90
): Promise<TrendPrediction[]> {
  const predictions: TrendPrediction[] = [];

  const hostMetrics = await collectHostMetrics(hostId, 24);
  if (!hostMetrics) return predictions;

  // CPU, 메모리, 디스크 사용률 메트릭만 분석
  const utilizationMetrics = hostMetrics.metrics.filter((m) =>
    m.itemKey.includes('util') || m.itemKey.includes('pused')
  );

  for (const metric of utilizationMetrics) {
    const values = metric.history.map((h) => h.value);
    if (values.length < 10) continue;

    const { direction, slope } = analyzeTrend(values);

    // 24시간 후 예측값
    const predictedValue = metric.lastValue + slope * metric.lastValue * 24;

    let risk: TrendPrediction['risk'] = 'low';
    let reason = 'Stable trend';

    if (direction === 'increasing') {
      if (predictedValue >= 100) {
        risk = 'high';
        reason = `Predicted to reach 100% within 24 hours`;
      } else if (predictedValue >= threshold) {
        risk = 'medium';
        reason = `Predicted to exceed ${threshold}% threshold`;
      }
    }

    if (metric.lastValue >= threshold) {
      risk = risk === 'low' ? 'medium' : risk;
      reason = `Currently above ${threshold}% threshold`;
    }

    predictions.push({
      hostId,
      hostName: hostMetrics.hostName,
      itemKey: metric.itemKey,
      itemName: metric.itemName,
      currentValue: metric.lastValue,
      trend: direction,
      slope,
      predictedValue24h: Math.min(100, Math.max(0, predictedValue)),
      risk,
      reason,
    });
  }

  return predictions.filter((p) => p.risk !== 'low');
}
