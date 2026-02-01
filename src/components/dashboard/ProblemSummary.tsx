'use client';

import { memo, useMemo } from 'react';
import { AlertOctagon, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface SeverityCounts {
  disaster: number;
  high: number;
  average: number;
  warning: number;
  information: number;
  notClassified: number;
}

interface ProblemSummaryProps {
  severity: SeverityCounts | null;
  isLoading?: boolean;
}

const severityConfig = [
  { key: 'disaster', label: 'Disaster', icon: AlertOctagon, bgColor: 'bg-red-500', textColor: 'text-white' },
  { key: 'high', label: 'High', icon: AlertCircle, bgColor: 'bg-orange-500', textColor: 'text-white' },
  { key: 'average', label: 'Average', icon: AlertTriangle, bgColor: 'bg-yellow-500', textColor: 'text-white' },
  { key: 'warning', label: 'Warning', icon: Info, bgColor: 'bg-blue-500', textColor: 'text-white' },
  { key: 'information', label: 'Info', icon: Info, bgColor: 'bg-cyan-500', textColor: 'text-white' },
  { key: 'notClassified', label: 'N/C', icon: CheckCircle, bgColor: 'bg-gray-400', textColor: 'text-white' },
] as const;

export const ProblemSummary = memo(function ProblemSummary({ severity, isLoading }: ProblemSummaryProps) {
  const total = useMemo(() => severity
    ? severity.disaster + severity.high + severity.average + severity.warning + severity.information + severity.notClassified
    : 0, [severity]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Problem Summary</h3>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded mb-4" />
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Problem Summary</h3>
        <span className="text-2xl font-bold text-gray-900">{total}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {severityConfig.map(({ key, label, icon: Icon, bgColor, textColor }) => {
          const count = severity ? severity[key] : 0;
          return (
            <div
              key={key}
              className={`${bgColor} ${textColor} rounded-lg p-3 text-center transition-transform hover:scale-105`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs opacity-90">{label}</div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <div className="mt-4 text-center py-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">All systems operational</p>
        </div>
      )}
    </div>
  );
});
