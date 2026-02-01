'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle,
  Filter,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '@/lib/export/exportUtils';
import { AppLayout } from '@/components/layout';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface Problem {
  eventid: string;
  name: string;
  severity: string;
  clock: string;
  acknowledged: string;
  hosts?: { name: string }[];
}

const severityConfigBase: Record<
  string,
  { icon: typeof AlertTriangle; color: string; bgColor: string; labelKey: string }
> = {
  '5': { icon: AlertOctagon, color: 'text-red-600', bgColor: 'bg-red-50', labelKey: 'disaster' },
  '4': { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50', labelKey: 'high' },
  '3': { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-50', labelKey: 'average' },
  '2': { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50', labelKey: 'warning' },
  '1': { icon: Info, color: 'text-cyan-600', bgColor: 'bg-cyan-50', labelKey: 'information' },
  '0': { icon: CheckCircle, color: 'text-gray-600', bgColor: 'bg-gray-50', labelKey: 'notClassified' },
};

export default function ProblemsPage() {
  const { autoRefresh, refreshInterval, searchQuery } = useStore();
  const { t } = useTranslation();

  // Build severity config with translated labels
  const severityConfig = Object.fromEntries(
    Object.entries(severityConfigBase).map(([key, config]) => [
      key,
      { ...config, label: t.problems.severity[config.labelKey as keyof typeof t.problems.severity] },
    ])
  );
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/zabbix?action=problems');
      const data = await res.json();
      if (data.success) {
        setProblems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  const filteredProblems = problems
    .filter((p) => !severityFilter || p.severity === severityFilter)
    .filter(
      (p) =>
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hosts?.some((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const severityCounts = problems.reduce(
    (acc, p) => {
      acc[p.severity] = (acc[p.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function formatTime(timestamp: string) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString('ko-KR');
  }

  const handleExportCSV = () => {
    const data = filteredProblems.map((problem) => ({
      Name: problem.name,
      Host: problem.hosts?.[0]?.name || 'Unknown',
      Severity: severityConfig[problem.severity]?.label || 'Unknown',
      Time: formatTime(problem.clock),
      Acknowledged: problem.acknowledged === '1' ? 'Yes' : 'No',
    }));
    exportToCSV(data, 'problems');
  };

  const handleExportExcel = () => {
    const data = filteredProblems.map((problem) => ({
      Name: problem.name,
      Host: problem.hosts?.[0]?.name || 'Unknown',
      Severity: severityConfig[problem.severity]?.label || 'Unknown',
      Time: formatTime(problem.clock),
      Acknowledged: problem.acknowledged === '1' ? 'Yes' : 'No',
    }));
    exportToExcel(data, 'problems');
  };

  return (
    <AppLayout title={t.problems.title}>
      {/* Severity Filter */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Object.entries(severityConfig).reverse().map(([key, config]) => {
          const count = severityCounts[key] || 0;
          const Icon = config.icon;
          const isActive = severityFilter === key;

          return (
            <button
              key={key}
              onClick={() => setSeverityFilter(isActive ? null : key)}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${config.bgColor}`}
            >
              <Icon className={`w-6 h-6 ${config.color} mx-auto mb-2`} />
              <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
              <div className="text-xs text-gray-600">{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* Problems List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {t.problems.activeProblems}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredProblems.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {severityFilter && (
              <button
                onClick={() => setSeverityFilter(null)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t.problems.clearFilter}
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t.problems.allClear}</h3>
              <p className="text-gray-500">{t.problems.noProblems}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem) => {
                const config = severityConfig[problem.severity] || severityConfig['0'];
                const Icon = config.icon;

                return (
                  <div
                    key={problem.eventid}
                    className={`p-4 rounded-lg border ${config.bgColor} border-current/20`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}
                      >
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{problem.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {problem.hosts?.[0]?.name || 'Unknown host'} •{' '}
                              {formatTime(problem.clock)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}
                            >
                              {config.label}
                            </span>
                            {problem.acknowledged === '1' && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                                ACK
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
