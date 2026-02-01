'use client';

import { AlertTriangle, AlertCircle, AlertOctagon, Info, CheckCircle } from 'lucide-react';

interface Problem {
  eventid: string;
  name: string;
  severity: string;
  clock: string;
  hosts?: { name: string }[];
}

interface ProblemListProps {
  problems: Problem[];
  isLoading?: boolean;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  '5': { icon: AlertOctagon, color: 'text-red-600 bg-red-50', label: 'Disaster' },
  '4': { icon: AlertCircle, color: 'text-orange-600 bg-orange-50', label: 'High' },
  '3': { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50', label: 'Average' },
  '2': { icon: Info, color: 'text-blue-600 bg-blue-50', label: 'Warning' },
  '1': { icon: Info, color: 'text-cyan-600 bg-cyan-50', label: 'Information' },
  '0': { icon: CheckCircle, color: 'text-gray-600 bg-gray-50', label: 'Not classified' },
};

function formatTime(timestamp: string) {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString('ko-KR');
}

export function ProblemList({ problems, isLoading }: ProblemListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Problems</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Problems</h3>
        <span className="text-sm text-gray-500">{problems.length} issues</span>
      </div>

      {problems.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500">No active problems</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {problems.map((problem) => {
            const config = severityConfig[problem.severity] || severityConfig['0'];
            const Icon = config.icon;

            return (
              <div
                key={problem.eventid}
                className={`p-4 rounded-lg border ${config.color} border-current/20`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{problem.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{problem.hosts?.[0]?.name || 'Unknown host'}</span>
                      <span>•</span>
                      <span>{formatTime(problem.clock)}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/50">
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
