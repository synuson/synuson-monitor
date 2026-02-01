'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  History,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { HistoryChart } from '@/components/dashboard';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface Event {
  eventid: string;
  clock: string;
  name: string;
  severity: string;
  value: string;
}

interface ChartData {
  timestamp: number;
  value: number;
}

interface HostStats {
  hostId: string;
  hostName: string;
  totalEvents: number;
  problemEvents: number;
  okEvents: number;
  uptime: number;
  avgResponseTime: number;
}

const severityLabelKeys: Record<string, string> = {
  '5': 'disaster',
  '4': 'high',
  '3': 'average',
  '2': 'warning',
  '1': 'information',
  '0': 'notClassified',
};

const severityColors: Record<string, string> = {
  '5': 'text-red-600',
  '4': 'text-orange-600',
  '3': 'text-yellow-600',
  '2': 'text-blue-600',
  '1': 'text-cyan-600',
  '0': 'text-gray-600',
};

export default function HistoryPage() {
  const { autoRefresh, refreshInterval } = useStore();
  const { t } = useTranslation();

  // Build severity labels with translations
  const severityLabels = Object.fromEntries(
    Object.entries(severityLabelKeys).map(([key, labelKey]) => [
      key,
      t.problems.severity[labelKey as keyof typeof t.problems.severity],
    ])
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [problemChartData, setProblemChartData] = useState<ChartData[]>([]);

  // Date range picker state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [useCustomRange, setUseCustomRange] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      let timeFrom: number;

      if (useCustomRange) {
        timeFrom = Math.floor(new Date(dateFrom).getTime() / 1000);
      } else {
        const timeFromMap: Record<string, number> = {
          '1h': Math.floor(Date.now() / 1000) - 3600,
          '6h': Math.floor(Date.now() / 1000) - 21600,
          '24h': Math.floor(Date.now() / 1000) - 86400,
          '7d': Math.floor(Date.now() / 1000) - 604800,
        };
        timeFrom = timeFromMap[timeRange];
      }

      const timeTo = useCustomRange
        ? Math.floor(new Date(dateTo).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const res = await fetch(
        `/api/zabbix?action=events&limit=200&time_from=${timeFrom}&time_to=${timeTo}`
      );
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);

        // Generate chart data from events
        const chartData: ChartData[] = [];
        const duration = timeTo - timeFrom;
        const bucketSize =
          duration <= 3600
            ? 300
            : duration <= 21600
            ? 1800
            : duration <= 86400
            ? 3600
            : 86400;

        for (let t = timeFrom; t <= timeTo; t += bucketSize) {
          const count = data.data.filter(
            (e: Event) =>
              parseInt(e.clock) >= t && parseInt(e.clock) < t + bucketSize
          ).length;
          chartData.push({ timestamp: t, value: count });
        }

        setProblemChartData(chartData);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, useCustomRange, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
    if (autoRefresh && !useCustomRange) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval, useCustomRange]);

  // Calculate statistics
  const problemCount = events.filter((e) => e.value === '1').length;
  const okCount = events.filter((e) => e.value === '0').length;
  const criticalCount = events.filter(
    (e) => e.severity === '5' || e.severity === '4'
  ).length;

  // Calculate uptime (percentage of OK events vs total)
  const uptimePercent =
    events.length > 0 ? Math.round((okCount / events.length) * 100) : 100;

  // Calculate average time between events (mock response time)
  const avgInterval =
    events.length > 1
      ? Math.round(
          (parseInt(events[0]?.clock || '0') -
            parseInt(events[events.length - 1]?.clock || '0')) /
            events.length
        )
      : 0;

  function formatTime(timestamp: string) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString('ko-KR');
  }

  return (
    <AppLayout title={t.history.title}>
      {/* Time Range Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {/* Quick Range Buttons */}
          <div className="flex gap-2">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setUseCustomRange(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useCustomRange && timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.history.timeRange[range]}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setUseCustomRange(true);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setUseCustomRange(true);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={fetchData}
              disabled={!useCustomRange}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                useCustomRange
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.common.apply}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.history.totalEvents}</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.hosts.uptime}</p>
              <p className="text-2xl font-bold text-green-600">{uptimePercent}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.history.criticalEvents}</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.history.avgInterval}</p>
              <p className="text-2xl font-bold text-purple-600">{avgInterval}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HistoryChart
          title={t.history.eventHistory}
          data={problemChartData}
          unit={` ${t.history.totalEvents.toLowerCase()}`}
          color="blue"
          isLoading={isLoading}
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">{t.history.eventHistory}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-gray-500">{t.history.problems}</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{problemCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-sm text-gray-500">{t.history.resolved}</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{okCount}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-orange-600">
                {events.filter((e) => e.severity === '3').length}
              </p>
              <p className="text-sm text-gray-500">{t.history.warnings}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-blue-600">
                {events.filter((e) => e.severity === '2' || e.severity === '1').length}
              </p>
              <p className="text-sm text-gray-500">{t.history.informational}</p>
            </div>
          </div>

          {/* Uptime Bar */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{t.history.overallUptime}</span>
              <span className="text-sm font-bold text-gray-900">{uptimePercent}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  uptimePercent >= 99
                    ? 'bg-green-500'
                    : uptimePercent >= 95
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${uptimePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">{t.history.eventHistory}</h2>
          <span className="text-sm text-gray-500">({events.length})</span>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t.history.noEvents}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 50).map((event) => (
                <div
                  key={event.eventid}
                  className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 w-40 flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatTime(event.clock)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${severityColors[event.severity]}`}
                  >
                    {severityLabels[event.severity]}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      event.value === '1'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {event.value === '1' ? t.status.problem.toUpperCase() : t.status.ok}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
