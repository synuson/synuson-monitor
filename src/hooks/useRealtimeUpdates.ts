'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';

export interface RealtimeData {
  timestamp: number;
  stats: {
    hostCount: number;
    problemCount: number;
    onlineCount: number;
    offlineCount: number;
  };
  hosts: {
    total: number;
    online: number;
    offline: number;
    offlineList: Array<{
      hostid: string;
      name: string;
      host: string;
    }>;
  };
  problems: {
    total: number;
    severityCounts: Record<string, number>;
    recent: Array<{
      eventid: string;
      name: string;
      severity: string;
      clock: string;
      hosts?: Array<{ name: string }>;
    }>;
  };
  services: {
    total: number;
    healthy: number;
    failed: number;
    failedList: Array<{
      httptestid: string;
      name: string;
      hosts?: Array<{ name: string }>;
    }>;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeUpdatesOptions {
  enabled?: boolean;
  interval?: number;
  onData?: (data: RealtimeData) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface UseRealtimeUpdatesReturn {
  data: RealtimeData | null;
  status: ConnectionStatus;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => void;
}

export function useRealtimeUpdates(
  options: UseRealtimeUpdatesOptions = {}
): UseRealtimeUpdatesReturn {
  const { enabled = true, interval = 10000, onData, onError, onStatusChange } = options;

  const [data, setData] = useState<RealtimeData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasConnectedRef = useRef(false);

  const { realtimeEnabled: storeEnabled, refreshInterval: storeInterval } = useStore();
  const actualInterval = storeInterval || interval;

  // Manual refresh
  const refresh = () => {
    fetchRealtimeData();
  };

  // Fetch data function
  const fetchRealtimeData = async () => {
    if (!isMountedRef.current) return;

    // 첫 연결 시에만 'connecting' 표시
    if (!hasConnectedRef.current) {
      setStatus('connecting');
      onStatusChange?.('connecting');
    }

    try {
      const response = await fetch('/api/realtime');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
        setStatus('connected');
        hasConnectedRef.current = true;
        onStatusChange?.('connected');
        onData?.(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
      onStatusChange?.('error');
      onError?.(errorMessage);
    }
  };

  // Effect for polling
  useEffect(() => {
    isMountedRef.current = true;
    const shouldPoll = enabled && storeEnabled;

    if (shouldPoll) {
      hasConnectedRef.current = false;
      fetchRealtimeData();
      intervalRef.current = setInterval(fetchRealtimeData, actualInterval);
    } else {
      setStatus('disconnected');
      onStatusChange?.('disconnected');
      hasConnectedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storeEnabled, actualInterval]);

  return { data, status, error, lastUpdate, refresh };
}
