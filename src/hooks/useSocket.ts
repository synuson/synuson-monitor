/**
 * WebSocket Client Hook
 * Socket.io 클라이언트를 React에서 사용하기 위한 커스텀 훅
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RealtimeData, ProblemEvent, HostStatusEvent } from '@/lib/websocket/socket-server';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: number | null;
}

interface UseSocketReturn {
  // 상태
  state: SocketState;
  data: RealtimeData | null;

  // 메서드
  connect: () => void;
  disconnect: () => void;
  refresh: () => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;

  // 이벤트 리스너
  onProblemNew: (callback: (event: ProblemEvent) => void) => () => void;
  onProblemResolved: (callback: (event: ProblemEvent) => void) => () => void;
  onHostStatus: (callback: (event: HostStatusEvent) => void) => () => void;
}

const DEFAULT_OPTIONS: UseSocketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: null,
  });

  const [data, setData] = useState<RealtimeData | null>(null);

  // 이벤트 리스너 저장소
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  // 소켓 연결
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const socket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: opts.reconnection,
      reconnectionAttempts: opts.reconnectionAttempts,
      reconnectionDelay: opts.reconnectionDelay,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
      }));
    });

    // 실시간 데이터 수신
    socket.on('realtime:update', (newData: RealtimeData) => {
      setData(newData);
      setState(prev => ({
        ...prev,
        lastUpdate: Date.now(),
      }));
    });

    // 문제 이벤트
    socket.on('problem:new', (event: ProblemEvent) => {
      listenersRef.current.get('problem:new')?.forEach(cb => cb(event));
    });

    socket.on('problem:resolved', (event: ProblemEvent) => {
      listenersRef.current.get('problem:resolved')?.forEach(cb => cb(event));
    });

    // 호스트 상태 이벤트
    socket.on('host:status', (event: HostStatusEvent) => {
      listenersRef.current.get('host:status')?.forEach(cb => cb(event));
    });

    socketRef.current = socket;
  }, [opts.reconnection, opts.reconnectionAttempts, opts.reconnectionDelay]);

  // 소켓 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState({
      connected: false,
      connecting: false,
      error: null,
      lastUpdate: null,
    });
  }, []);

  // 수동 새로고침
  const refresh = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('refresh');
    }
  }, []);

  // 채널 구독
  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channels);
    }
  }, []);

  // 채널 구독 해제
  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channels);
    }
  }, []);

  // 이벤트 리스너 등록 헬퍼
  const addListener = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // cleanup 함수 반환
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  // 문제 발생 리스너
  const onProblemNew = useCallback((callback: (event: ProblemEvent) => void) => {
    return addListener('problem:new', callback as (data: unknown) => void);
  }, [addListener]);

  // 문제 해결 리스너
  const onProblemResolved = useCallback((callback: (event: ProblemEvent) => void) => {
    return addListener('problem:resolved', callback as (data: unknown) => void);
  }, [addListener]);

  // 호스트 상태 리스너
  const onHostStatus = useCallback((callback: (event: HostStatusEvent) => void) => {
    return addListener('host:status', callback as (data: unknown) => void);
  }, [addListener]);

  // 자동 연결
  const didConnectRef = useRef(false);
  useEffect(() => {
    if (opts.autoConnect && !didConnectRef.current) {
      didConnectRef.current = true;
      // Use setTimeout to avoid calling setState synchronously in effect
      const timer = setTimeout(() => {
        connect();
      }, 0);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
    return () => {
      disconnect();
    };
  }, [opts.autoConnect, connect, disconnect]);

  return {
    state,
    data,
    connect,
    disconnect,
    refresh,
    subscribe,
    unsubscribe,
    onProblemNew,
    onProblemResolved,
    onHostStatus,
  };
}

// 간단한 실시간 데이터 훅
export function useRealtimeData() {
  const { state, data, refresh } = useSocket();

  return {
    data,
    isConnected: state.connected,
    isLoading: state.connecting,
    error: state.error,
    lastUpdate: state.lastUpdate,
    refresh,
  };
}

// 문제 알림 훅
export function useProblemNotifications() {
  const [notifications, setNotifications] = useState<ProblemEvent[]>([]);
  const { onProblemNew, onProblemResolved } = useSocket();

  useEffect(() => {
    const unsubNew = onProblemNew((event) => {
      setNotifications(prev => [...prev, event].slice(-50)); // 최근 50개만 유지
    });

    const unsubResolved = onProblemResolved((event) => {
      setNotifications(prev => [...prev, event].slice(-50));
    });

    return () => {
      unsubNew();
      unsubResolved();
    };
  }, [onProblemNew, onProblemResolved]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    clearNotifications,
    newCount: notifications.filter(n => n.type === 'new').length,
    resolvedCount: notifications.filter(n => n.type === 'resolved').length,
  };
}

export default useSocket;
