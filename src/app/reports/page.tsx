'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileBarChart,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';
import { exportToCSV, exportToExcel } from '@/lib/export/exportUtils';

interface HostSLA {
  hostid: string;
  hostname: string;
  name: string;
  totalTime: number; // Total monitoring time in seconds
  downtimeSeconds: number;
  uptimePercent: number;
  incidents: number;
  mttr: number; // Mean Time To Repair (seconds)
  mtbf: number; // Mean Time Between Failures (seconds)
}

interface SLAReport {
  period: string;
  startDate: string;
  endDate: string;
  hosts: HostSLA[];
  totalHosts: number;
  averageUptime: number;
  totalIncidents: number;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export default function ReportsPage() {
  const { autoRefresh, refreshInterval } = useStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [report, setReport] = useState<SLAReport | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);

  // Calculate date range based on period
  const getDateRange = useCallback((p: ReportPeriod) => {
    const now = new Date();
    let startDate: Date;

    switch (p) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { startDate, endDate: now };
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(period);
      const timeFrom = Math.floor(startDate.getTime() / 1000);
      const timeTo = Math.floor(endDate.getTime() / 1000);

      // Fetch hosts
      const hostsRes = await fetch('/api/zabbix?action=hosts');
      const hostsData = await hostsRes.json();

      // Fetch events for the period
      const eventsRes = await fetch(
        `/api/zabbix?action=events&limit=1000&time_from=${timeFrom}&time_to=${timeTo}`
      );
      const eventsData = await eventsRes.json();

      if (hostsData.success && eventsData.success) {
        const hosts = hostsData.data.filter((h: { status: string }) => h.status === '0');
        const events = eventsData.data;

        // Calculate SLA metrics for each host
        const totalMonitoringTime = timeTo - timeFrom;
        const hostSLAs: HostSLA[] = hosts.map((host: { hostid: string; host: string; name: string }) => {
          const hostEvents = events.filter((e: { name: string }) =>
            e.name.toLowerCase().includes(host.name.toLowerCase()) ||
            e.name.toLowerCase().includes(host.host.toLowerCase())
          );

          const problems = hostEvents.filter((e: { value: string }) => e.value === '1');
          const recoveries = hostEvents.filter((e: { value: string }) => e.value === '0');

          // Calculate downtime (simplified - assumes each problem lasts until recovery)
          let totalDowntime = 0;
          let mttrSum = 0;

          problems.forEach((problem: { clock: string }, i: number) => {
            const recovery = recoveries[i];
            if (recovery) {
              const downtime = parseInt(recovery.clock) - parseInt(problem.clock);
              totalDowntime += downtime;
              mttrSum += downtime;
            } else {
              // If no recovery, assume still down
              totalDowntime += timeTo - parseInt(problem.clock);
            }
          });

          const uptimeSeconds = totalMonitoringTime - totalDowntime;
          const uptimePercent = (uptimeSeconds / totalMonitoringTime) * 100;
          const mttr = problems.length > 0 ? mttrSum / problems.length : 0;
          const mtbf = problems.length > 1 ? totalMonitoringTime / problems.length : totalMonitoringTime;

          return {
            hostid: host.hostid,
            hostname: host.host,
            name: host.name,
            totalTime: totalMonitoringTime,
            downtimeSeconds: totalDowntime,
            uptimePercent: Math.min(100, Math.max(0, uptimePercent)),
            incidents: problems.length,
            mttr,
            mtbf,
          };
        });

        const averageUptime =
          hostSLAs.reduce((sum, h) => sum + h.uptimePercent, 0) / hostSLAs.length || 100;
        const totalIncidents = hostSLAs.reduce((sum, h) => sum + h.incidents, 0);

        setReport({
          period,
          startDate: startDate.toLocaleDateString('ko-KR'),
          endDate: endDate.toLocaleDateString('ko-KR'),
          hosts: hostSLAs.sort((a, b) => a.uptimePercent - b.uptimePercent),
          totalHosts: hostSLAs.length,
          averageUptime,
          totalIncidents,
        });
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, getDateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!report) return;
    exportToCSV(
      report.hosts.map((h) => ({
        Host: h.name,
        Hostname: h.hostname,
        'Uptime %': h.uptimePercent.toFixed(2),
        Incidents: h.incidents,
        'MTTR (min)': Math.round(h.mttr / 60),
        'MTBF (hours)': Math.round(h.mtbf / 3600),
      })),
      `sla-report-${report.period}-${new Date().toISOString().slice(0, 10)}`
    );
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportToExcel(
      report.hosts.map((h) => ({
        Host: h.name,
        Hostname: h.hostname,
        'Uptime %': h.uptimePercent.toFixed(2),
        Incidents: h.incidents,
        'MTTR (min)': Math.round(h.mttr / 60),
        'MTBF (hours)': Math.round(h.mtbf / 3600),
      })),
      `sla-report-${report.period}-${new Date().toISOString().slice(0, 10)}`
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}${t.time.seconds}`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}${t.time.minutes}`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}${t.time.hours}`;
    return `${Math.round(seconds / 86400)}${t.time.days}`;
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'text-green-600';
    if (uptime >= 99) return 'text-green-500';
    if (uptime >= 95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getUptimeBgColor = (uptime: number) => {
    if (uptime >= 99.9) return 'bg-green-500';
    if (uptime >= 99) return 'bg-green-400';
    if (uptime >= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <AppLayout title={t.reports.title}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileBarChart className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.reports.title}</h1>
              {report && (
                <p className="text-gray-500">
                  {report.startDate} ~ {report.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Period Selector & Export */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {t.reports[p]}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={!report}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleExportExcel}
                disabled={!report}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-100 rounded-xl" />
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.reports.availability}</p>
                  <p className={`text-2xl font-bold ${getUptimeColor(report.averageUptime)}`}>
                    {report.averageUptime.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.hosts.totalHosts}</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalHosts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.reports.incidents}</p>
                  <p className="text-2xl font-bold text-red-600">{report.totalIncidents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.reports.mttr}</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(
                      report.hosts.reduce((sum, h) => sum + h.mttr, 0) / report.hosts.length || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Host SLA Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                {t.hosts.title} SLA
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({report.hosts.length} hosts)
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.hosts.title}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.reports.uptime}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.reports.incidents}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.reports.downtime}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MTTR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MTBF
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.hosts.map((host) => (
                    <tr key={host.hostid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{host.name}</p>
                          <p className="text-sm text-gray-500">{host.hostname}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getUptimeBgColor(host.uptimePercent)}`}
                              style={{ width: `${host.uptimePercent}%` }}
                            />
                          </div>
                          <span className={`font-medium ${getUptimeColor(host.uptimePercent)}`}>
                            {host.uptimePercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-sm font-medium ${
                            host.incidents === 0
                              ? 'bg-green-100 text-green-700'
                              : host.incidents < 5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {host.incidents}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatDuration(host.downtimeSeconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {host.incidents > 0 ? formatDuration(host.mttr) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {host.incidents > 0 ? formatDuration(host.mtbf) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t.common.noData}</p>
        </div>
      )}
    </AppLayout>
  );
}
