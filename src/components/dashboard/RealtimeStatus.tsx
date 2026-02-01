'use client';

import { useMemo } from 'react';
import { Radio, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useRealtimeUpdates, ConnectionStatus, RealtimeData } from '@/hooks/useRealtimeUpdates';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface RealtimeStatusProps {
  onUpdate?: (data: RealtimeData) => void;
  showDetails?: boolean;
}

const statusConfig: Record<ConnectionStatus, { color: string; bgColor: string; icon: typeof Wifi }> = {
  connecting: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: RefreshCw },
  connected: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Wifi },
  disconnected: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: WifiOff },
  error: { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
};

export function RealtimeStatus({ onUpdate, showDetails = true }: RealtimeStatusProps) {
  const { realtimeEnabled, setRealtimeEnabled } = useStore();
  const { t } = useTranslation();

  const { status, data, lastUpdate, refresh } = useRealtimeUpdates({
    enabled: realtimeEnabled,
    onData: (newData) => {
      onUpdate?.(newData);
    },
  });

  const lastUpdateTime = useMemo(() => {
    if (!lastUpdate) return '';
    return new Date(lastUpdate).toLocaleTimeString('ko-KR');
  }, [lastUpdate]);

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const statusLabels: Record<ConnectionStatus, string> = {
    connecting: t.common.loading,
    connected: t.status.online,
    disconnected: t.status.offline,
    error: t.status.warning,
  };

  return (
    <div className="flex items-center gap-3">
      {/* Toggle Button */}
      <button
        onClick={() => setRealtimeEnabled(!realtimeEnabled)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          realtimeEnabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Radio className={`w-4 h-4 ${realtimeEnabled ? 'animate-pulse' : ''}`} />
        <span>Realtime</span>
      </button>

      {/* Status Indicator */}
      {realtimeEnabled && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor}`}>
            <StatusIcon
              className={`w-3.5 h-3.5 ${config.color} ${status === 'connecting' ? 'animate-spin' : ''}`}
            />
            <span className={`text-xs font-medium ${config.color}`}>
              {statusLabels[status]}
            </span>
          </div>

          {showDetails && status === 'connected' && lastUpdateTime && (
            <span className="text-xs text-gray-500">
              {lastUpdateTime}
            </span>
          )}

          {status === 'error' && (
            <button
              onClick={refresh}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              {t.common.refresh}
            </button>
          )}
        </div>
      )}

      {/* Quick Stats when connected */}
      {realtimeEnabled && status === 'connected' && data && showDetails && (
        <div className="hidden md:flex items-center gap-3 ml-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{t.hosts.online}:</span>
            <span className="font-medium text-green-600">{data.hosts.online}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{t.problems.title}:</span>
            <span className={`font-medium ${data.problems.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.problems.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
