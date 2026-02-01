'use client';

import { Server, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface Host {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available: string;
}

interface HostListProps {
  hosts: Host[];
  isLoading?: boolean;
}

const availabilityConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  '1': { icon: CheckCircle2, color: 'text-green-500', label: 'Available' },
  '2': { icon: XCircle, color: 'text-red-500', label: 'Unavailable' },
  '0': { icon: MinusCircle, color: 'text-gray-400', label: 'Unknown' },
};

export function HostList({ hosts, isLoading }: HostListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hosts</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const enabledHosts = hosts.filter((h) => h.status === '0');
  const availableCount = enabledHosts.filter((h) => h.available === '1').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Hosts</h3>
        <span className="text-sm text-gray-500">
          {availableCount}/{enabledHosts.length} online
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {enabledHosts.map((host) => {
          const config = availabilityConfig[host.available] || availabilityConfig['0'];
          const Icon = config.icon;

          return (
            <div
              key={host.hostid}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Server className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{host.name}</p>
                <p className="text-sm text-gray-500 truncate">{host.host}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-sm ${config.color}`}>{config.label}</span>
              </div>
            </div>
          );
        })}

        {enabledHosts.length === 0 && (
          <div className="text-center py-8">
            <Server className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hosts configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
