'use client';

import { Cpu, HardDrive, TrendingUp } from 'lucide-react';

interface ResourceItem {
  itemid: string;
  hostid: string;
  name: string;
  key_: string;
  lastvalue: string;
  units: string;
  hosts?: { hostid: string; host: string; name: string }[];
}

interface ResourceTopProps {
  cpuItems: ResourceItem[];
  memoryItems: ResourceItem[];
  isLoading?: boolean;
}

function getProgressColor(value: number): string {
  if (value >= 90) return 'bg-red-500';
  if (value >= 70) return 'bg-orange-500';
  if (value >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function ResourceBar({ item, type }: { item: ResourceItem; type: 'cpu' | 'memory' }) {
  const value = parseFloat(item.lastvalue) || 0;
  const displayValue = Math.min(100, Math.max(0, value));
  const hostName = item.hosts?.[0]?.name || 'Unknown';

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-32 truncate text-sm text-gray-700" title={hostName}>
        {hostName}
      </div>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor(displayValue)} transition-all duration-500`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
      <div className="w-16 text-right text-sm font-medium text-gray-900">
        {displayValue.toFixed(1)}%
      </div>
    </div>
  );
}

export function ResourceTop({ cpuItems, memoryItems, isLoading }: ResourceTopProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage Top 10</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Resource Usage Top 10</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-orange-500" />
            <h4 className="font-medium text-gray-800">CPU Usage</h4>
          </div>
          {cpuItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No CPU data available</p>
          ) : (
            <div className="space-y-1">
              {cpuItems.slice(0, 10).map((item) => (
                <ResourceBar key={item.itemid} item={item} type="cpu" />
              ))}
            </div>
          )}
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-purple-500" />
            <h4 className="font-medium text-gray-800">Memory Usage</h4>
          </div>
          {memoryItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No memory data available</p>
          ) : (
            <div className="space-y-1">
              {memoryItems.slice(0, 10).map((item) => (
                <ResourceBar key={item.itemid} item={item} type="memory" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
