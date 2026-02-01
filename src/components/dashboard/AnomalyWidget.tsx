'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ChevronRight,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';

interface AnomalyScore {
  hostId: string;
  hostName: string;
  itemKey: string;
  itemName: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  zScore: number;
  anomalyScore: number;
  severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  reason: string;
}

interface AnomalySummary {
  totalHosts: number;
  hostsWithAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topAnomalies: AnomalyScore[];
  timestamp: number;
}

interface AnomalyWidgetProps {
  refreshInterval?: number;
}

export function AnomalyWidget({ refreshInterval = 60000 }: AnomalyWidgetProps) {
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/anomaly?action=summary');
      const result = await response.json();

      if (result.success) {
        setSummary(result.data.summary || result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch anomaly data');
      }
    } catch (err) {
      setError('Failed to connect to anomaly service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnomalies, refreshInterval]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getMetricIcon = (itemKey: string) => {
    if (itemKey.includes('cpu')) return <Cpu className="w-4 h-4" />;
    if (itemKey.includes('memory') || itemKey.includes('vm.')) return <HardDrive className="w-4 h-4" />;
    if (itemKey.includes('net.') || itemKey.includes('if.')) return <Wifi className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (loading && !summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            AI 이상 탐지
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            AI 이상 탐지
          </h3>
          <button
            onClick={fetchAnomalies}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500">
          <p>{error}</p>
          <button
            onClick={fetchAnomalies}
            className="mt-2 text-blue-500 hover:underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totalAnomalies =
    (summary?.criticalCount || 0) +
    (summary?.highCount || 0) +
    (summary?.mediumCount || 0) +
    (summary?.lowCount || 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          AI 이상 탐지
        </h3>
        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {summary?.criticalCount || 0}
          </div>
          <div className="text-xs text-red-600">Critical</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {summary?.highCount || 0}
          </div>
          <div className="text-xs text-orange-600">High</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {summary?.mediumCount || 0}
          </div>
          <div className="text-xs text-yellow-600">Medium</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {summary?.lowCount || 0}
          </div>
          <div className="text-xs text-blue-600">Low</div>
        </div>
      </div>

      {/* 호스트 통계 */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span className="font-medium">{summary?.hostsWithAnomalies || 0}</span>
        <span> / {summary?.totalHosts || 0} 호스트에서 이상 감지</span>
      </div>

      {/* 상위 이상 항목 */}
      {summary?.topAnomalies && summary.topAnomalies.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            주요 이상 항목
          </h4>
          {summary.topAnomalies.slice(0, 5).map((anomaly, index) => (
            <div
              key={`${anomaly.hostId}-${anomaly.itemKey}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                  {getMetricIcon(anomaly.itemKey)}
                </div>
                <div>
                  <div className="font-medium text-sm">{anomaly.hostName}</div>
                  <div className="text-xs text-gray-500">{anomaly.itemName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {anomaly.deviation > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-blue-500" />
                  )}
                  <span
                    className={`font-medium ${
                      anomaly.deviation > 0 ? 'text-red-500' : 'text-blue-500'
                    }`}
                  >
                    {anomaly.deviation > 0 ? '+' : ''}
                    {anomaly.deviation.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  점수: {anomaly.anomalyScore.toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>현재 감지된 이상 없음</p>
          <p className="text-xs">모든 메트릭이 정상 범위입니다</p>
        </div>
      )}

      {/* 더보기 링크 */}
      {totalAnomalies > 5 && (
        <div className="mt-4 text-center">
          <a
            href="/anomaly"
            className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1"
          >
            전체 {totalAnomalies}개 이상 보기
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* 마지막 업데이트 시간 */}
      {summary?.timestamp && (
        <div className="mt-4 text-xs text-gray-400 text-right">
          마지막 분석: {new Date(summary.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default AnomalyWidget;
