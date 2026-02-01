/**
 * Anomaly Detection Engine
 * 통계 기반 이상 탐지 엔진
 */

import {
  MetricDataPoint,
  MetricBaseline,
  AnomalyScore,
  AnomalyDetectionResult,
  AnomalyConfig,
  DEFAULT_ANOMALY_CONFIG,
} from './types';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';
import { logger } from '@/lib/logging';

// ============================================
// 통계 함수
// ============================================

/**
 * 평균 계산
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 표준편차 계산
 */
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const avg = mean ?? calculateMean(values);
  const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(calculateMean(squareDiffs));
}

/**
 * Z-Score 계산
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * 이동 평균 계산
 */
export function calculateMovingAverage(values: number[], windowSize: number): number[] {
  if (values.length < windowSize) return values;

  const result: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    result.push(calculateMean(window));
  }
  return result;
}

/**
 * 지수 이동 평균 (EMA) 계산
 */
export function calculateEMA(values: number[], alpha: number = 0.2): number[] {
  if (values.length === 0) return [];

  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * IQR (Interquartile Range) 기반 이상치 경계 계산
 */
export function calculateIQRBounds(values: number[]): { lower: number; upper: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}

// ============================================
// 베이스라인 관리
// ============================================

/**
 * 메트릭 데이터로 베이스라인 생성/업데이트
 */
export function createBaseline(
  hostId: string,
  itemKey: string,
  itemName: string,
  dataPoints: MetricDataPoint[],
  existingBaseline?: MetricBaseline
): MetricBaseline {
  const values = dataPoints.map((dp) => dp.value);

  if (values.length === 0) {
    return existingBaseline || {
      hostId,
      itemKey,
      itemName,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      sampleCount: 0,
      lastUpdated: Date.now(),
    };
  }

  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);

  // 시간대별 패턴 계산
  const hourlyPattern: number[] = new Array(24).fill(0);
  const hourlyCounts: number[] = new Array(24).fill(0);

  dataPoints.forEach((dp) => {
    const hour = new Date(dp.timestamp * 1000).getHours();
    hourlyPattern[hour] += dp.value;
    hourlyCounts[hour]++;
  });

  for (let i = 0; i < 24; i++) {
    if (hourlyCounts[i] > 0) {
      hourlyPattern[i] = hourlyPattern[i] / hourlyCounts[i];
    } else {
      hourlyPattern[i] = mean; // 데이터 없으면 전체 평균 사용
    }
  }

  // 기존 베이스라인과 병합 (지수 가중 평균)
  if (existingBaseline && existingBaseline.sampleCount > 0) {
    const alpha = 0.3; // 새 데이터 가중치
    return {
      hostId,
      itemKey,
      itemName,
      mean: alpha * mean + (1 - alpha) * existingBaseline.mean,
      stdDev: alpha * stdDev + (1 - alpha) * existingBaseline.stdDev,
      min: Math.min(Math.min(...values), existingBaseline.min),
      max: Math.max(Math.max(...values), existingBaseline.max),
      sampleCount: existingBaseline.sampleCount + values.length,
      lastUpdated: Date.now(),
      hourlyPattern: hourlyPattern.map((val, i) =>
        alpha * val + (1 - alpha) * (existingBaseline.hourlyPattern?.[i] ?? val)
      ),
    };
  }

  return {
    hostId,
    itemKey,
    itemName,
    mean,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    sampleCount: values.length,
    lastUpdated: Date.now(),
    hourlyPattern,
  };
}

/**
 * 베이스라인 캐시에서 조회
 */
export async function getBaseline(hostId: string, itemKey: string): Promise<MetricBaseline | null> {
  const cacheKey = CACHE_KEYS.ANOMALY_BASELINE(hostId, itemKey);
  return cacheGet<MetricBaseline>(cacheKey);
}

/**
 * 베이스라인 캐시에 저장
 */
export async function saveBaseline(baseline: MetricBaseline): Promise<void> {
  const cacheKey = CACHE_KEYS.ANOMALY_BASELINE(baseline.hostId, baseline.itemKey);
  await cacheSet(cacheKey, baseline, CACHE_TTL.ANOMALY_BASELINE);
}

// ============================================
// 이상 탐지
// ============================================

/**
 * 단일 메트릭 값의 이상 여부 분석
 */
export function analyzeValue(
  value: number,
  baseline: MetricBaseline,
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): AnomalyScore {
  const currentHour = new Date().getHours();

  // 시간대별 기대값 (패턴 사용 시)
  let expectedValue = baseline.mean;
  if (config.enableTimePattern && baseline.hourlyPattern) {
    expectedValue = baseline.hourlyPattern[currentHour];
  }

  // 표준편차 (최소값 보장)
  const effectiveStdDev = Math.max(baseline.stdDev, baseline.mean * 0.1);

  // Z-Score 계산
  const zScore = calculateZScore(value, expectedValue, effectiveStdDev);
  const absZScore = Math.abs(zScore);

  // 편차율 계산
  const deviation = expectedValue !== 0
    ? ((value - expectedValue) / expectedValue) * 100
    : value;

  // 이상 점수 (0-100)
  // Z-Score 3 = 50점, Z-Score 6 = 100점
  const anomalyScore = Math.min(100, Math.max(0, (absZScore / 6) * 100));

  // 심각도 결정
  let severity: AnomalyScore['severity'] = 'normal';
  let reason = 'Normal range';

  if (absZScore >= 5) {
    severity = 'critical';
    reason = `Extreme deviation: ${deviation.toFixed(1)}% from expected`;
  } else if (absZScore >= 4) {
    severity = 'high';
    reason = `High deviation: ${deviation.toFixed(1)}% from expected`;
  } else if (absZScore >= config.zScoreThreshold) {
    severity = 'medium';
    reason = `Moderate deviation: ${deviation.toFixed(1)}% from expected`;
  } else if (absZScore >= 2) {
    severity = 'low';
    reason = `Slight deviation: ${deviation.toFixed(1)}% from expected`;
  }

  // 범위 벗어남 체크
  if (value > baseline.max * 1.5) {
    severity = severity === 'normal' ? 'medium' : severity;
    reason = `Value exceeds historical maximum by ${((value / baseline.max - 1) * 100).toFixed(1)}%`;
  }

  return {
    hostId: baseline.hostId,
    hostName: '', // 호출자가 설정
    itemKey: baseline.itemKey,
    itemName: baseline.itemName,
    currentValue: value,
    expectedValue,
    deviation,
    zScore,
    anomalyScore,
    severity,
    timestamp: Date.now(),
    reason,
  };
}

/**
 * 여러 메트릭의 이상 탐지 결과 집계
 */
export function aggregateAnomalies(
  hostId: string,
  hostName: string,
  anomalies: AnomalyScore[]
): AnomalyDetectionResult {
  // 비정상 항목만 필터
  const significantAnomalies = anomalies.filter((a) => a.severity !== 'normal');

  // 호스트 전체 점수 계산 (가중 평균)
  const weights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    normal: 0,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  anomalies.forEach((a) => {
    const weight = weights[a.severity];
    weightedSum += a.anomalyScore * weight;
    totalWeight += weight;
  });

  const totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    hostId,
    hostName,
    totalScore: Math.round(totalScore),
    anomalies: significantAnomalies.map((a) => ({ ...a, hostName })),
    timestamp: Date.now(),
  };
}

// ============================================
// 트렌드 분석
// ============================================

/**
 * 트렌드 방향 분석
 */
export function analyzeTrend(
  values: number[]
): { direction: 'increasing' | 'decreasing' | 'stable'; slope: number } {
  if (values.length < 2) {
    return { direction: 'stable', slope: 0 };
  }

  // 선형 회귀로 기울기 계산
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // 정규화된 기울기
  const normalizedSlope = yMean !== 0 ? slope / yMean : slope;

  let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (normalizedSlope > 0.01) {
    direction = 'increasing';
  } else if (normalizedSlope < -0.01) {
    direction = 'decreasing';
  }

  return { direction, slope: normalizedSlope };
}

/**
 * 급격한 변화 감지
 */
export function detectSpikeOrDrop(
  values: number[],
  threshold: number = 2
): { hasSpike: boolean; hasDrop: boolean; indices: number[] } {
  if (values.length < 3) {
    return { hasSpike: false, hasDrop: false, indices: [] };
  }

  const diffs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }

  const diffMean = calculateMean(diffs);
  const diffStdDev = calculateStdDev(diffs, diffMean);

  const indices: number[] = [];
  let hasSpike = false;
  let hasDrop = false;

  diffs.forEach((diff, i) => {
    const zScore = calculateZScore(diff, diffMean, diffStdDev);
    if (Math.abs(zScore) > threshold) {
      indices.push(i + 1);
      if (zScore > 0) hasSpike = true;
      else hasDrop = true;
    }
  });

  return { hasSpike, hasDrop, indices };
}
