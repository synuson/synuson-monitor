/**
 * Socket.io Server for Real-time Updates
 * Next.js App Router에서 Socket.io를 사용하기 위한 서버 설정
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { ZabbixClient } from '@/lib/zabbix/client';

// 전역 Socket.io 인스턴스
let io: SocketIOServer | null = null;

// 실시간 데이터 폴링 인터벌
let pollingInterval: NodeJS.Timeout | null = null;

// 연결된 클라이언트 수
let connectedClients = 0;

// Zabbix 클라이언트 인스턴스
const getZabbixClient = () => {
  return new ZabbixClient({
    url: process.env.ZABBIX_URL || 'http://localhost:8080',
    user: process.env.ZABBIX_USER || 'Admin',
    password: process.env.ZABBIX_PASSWORD || 'zabbix',
  });
};

// 이벤트 타입 정의
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
    inMaintenance: number;
  };
  problems: {
    total: number;
    suppressed: number;
    severityCounts: Record<string, number>;
    recent: Array<{
      eventid: string;
      name: string;
      severity: string;
      clock: string;
      hosts?: Array<{ hostid: string; name: string }>;
      acknowledged: string;
    }>;
  };
  services: {
    total: number;
    healthy: number;
    failed: number;
  };
}

export interface ProblemEvent {
  type: 'new' | 'resolved' | 'acknowledged';
  problem: {
    eventid: string;
    name: string;
    severity: string;
    hosts?: Array<{ hostid: string; name: string }>;
  };
}

export interface HostStatusEvent {
  type: 'online' | 'offline' | 'maintenance';
  host: {
    hostid: string;
    name: string;
    host: string;
  };
}

// 실시간 데이터 가져오기
async function fetchRealtimeData(): Promise<RealtimeData | null> {
  const client = getZabbixClient();

  try {
    await client.login();

    const [hosts, problems, hostCount, problemCount, httpTests, hostsInMaintenance] = await Promise.all([
      client.getHosts(),
      client.getProblems(),
      client.getHostCount(),
      client.getProblemCount(),
      client.getHttpTests(),
      client.getHostsInMaintenance(),
    ]);

    await client.logout();

    const maintenanceHostIds = new Set(hostsInMaintenance.map((h) => h.hostid));
    const enabledHosts = hosts.filter((h) => h.status === '0');
    const onlineHosts = enabledHosts.filter((h) => h.available === '1');
    const offlineHosts = enabledHosts.filter((h) => h.available !== '1');
    const hostsInMaintenanceCount = enabledHosts.filter((h) =>
      maintenanceHostIds.has(h.hostid)
    ).length;

    const activeProblems = problems.filter((p) => {
      if (!p.hosts || p.hosts.length === 0) return true;
      return p.hosts.some((h) => !maintenanceHostIds.has(h.hostid));
    });

    const suppressedProblems = problems.filter((p) => {
      if (!p.hosts || p.hosts.length === 0) return false;
      return p.hosts.every((h) => maintenanceHostIds.has(h.hostid));
    });

    const severityCounts = activeProblems.reduce(
      (acc, p) => {
        const severity = p.severity || '0';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const enabledServices = httpTests.filter((t) => t.status === '0');
    const healthyServices = enabledServices.filter((t) => t.lastfailedstep === '0');
    const failedServices = enabledServices.filter((t) => t.lastfailedstep !== '0');

    return {
      timestamp: Date.now(),
      stats: {
        hostCount: hostCount,
        problemCount: activeProblems.length,
        onlineCount: onlineHosts.length,
        offlineCount: offlineHosts.length,
      },
      hosts: {
        total: enabledHosts.length,
        online: onlineHosts.length,
        offline: offlineHosts.length,
        inMaintenance: hostsInMaintenanceCount,
      },
      problems: {
        total: activeProblems.length,
        suppressed: suppressedProblems.length,
        severityCounts,
        recent: activeProblems.slice(0, 10).map((p) => ({
          eventid: p.eventid,
          name: p.name,
          severity: p.severity,
          clock: p.clock,
          hosts: p.hosts,
          acknowledged: p.acknowledged,
        })),
      },
      services: {
        total: enabledServices.length,
        healthy: healthyServices.length,
        failed: failedServices.length,
      },
    };
  } catch (error) {
    console.error('[WebSocket] Error fetching realtime data:', error);
    return null;
  }
}

// 폴링 시작
function startPolling() {
  if (pollingInterval) return;

  console.log('[WebSocket] Starting polling...');

  // 이전 데이터 저장 (변경 감지용)
  let previousData: RealtimeData | null = null;

  pollingInterval = setInterval(async () => {
    if (!io || connectedClients === 0) {
      stopPolling();
      return;
    }

    const data = await fetchRealtimeData();
    if (data) {
      // 전체 데이터 브로드캐스트
      io.emit('realtime:update', data);

      // 변경 감지 및 이벤트 발송
      if (previousData) {
        // 새로운 문제 감지
        const currentProblemIds = new Set(data.problems.recent.map(p => p.eventid));
        const previousProblemIds = new Set(previousData.problems.recent.map(p => p.eventid));

        data.problems.recent.forEach(problem => {
          if (!previousProblemIds.has(problem.eventid)) {
            io?.emit('problem:new', {
              type: 'new',
              problem,
            } as ProblemEvent);
          }
        });

        // 해결된 문제 감지
        previousData.problems.recent.forEach(problem => {
          if (!currentProblemIds.has(problem.eventid)) {
            io?.emit('problem:resolved', {
              type: 'resolved',
              problem,
            } as ProblemEvent);
          }
        });
      }

      previousData = data;
    }
  }, 5000); // 5초마다 폴링
}

// 폴링 중지
function stopPolling() {
  if (pollingInterval) {
    console.log('[WebSocket] Stopping polling...');
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Socket.io 초기화
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  console.log('[WebSocket] Initializing Socket.io server...');

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXTAUTH_URL
        : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    connectedClients++;
    console.log(`[WebSocket] Client connected: ${socket.id} (Total: ${connectedClients})`);

    // 첫 연결 시 폴링 시작
    if (connectedClients === 1) {
      startPolling();
    }

    // 초기 데이터 전송
    fetchRealtimeData().then(data => {
      if (data) {
        socket.emit('realtime:update', data);
      }
    });

    // 클라이언트 구독 처리
    socket.on('subscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.join(channel);
        console.log(`[WebSocket] ${socket.id} subscribed to ${channel}`);
      });
    });

    socket.on('unsubscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.leave(channel);
        console.log(`[WebSocket] ${socket.id} unsubscribed from ${channel}`);
      });
    });

    // 수동 새로고침 요청
    socket.on('refresh', async () => {
      const data = await fetchRealtimeData();
      if (data) {
        socket.emit('realtime:update', data);
      }
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      connectedClients--;
      console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason}). Total: ${connectedClients}`);

      // 모든 클라이언트 연결 해제 시 폴링 중지
      if (connectedClients === 0) {
        stopPolling();
      }
    });

    // 에러 처리
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}

// Socket.io 인스턴스 가져오기
export function getSocketServer(): SocketIOServer | null {
  return io;
}

// 특정 이벤트 브로드캐스트
export function broadcastEvent(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}

// 특정 채널에 이벤트 전송
export function emitToChannel(channel: string, event: string, data: unknown) {
  if (io) {
    io.to(channel).emit(event, data);
  }
}

// 서버 상태 확인
export function getServerStatus() {
  return {
    initialized: io !== null,
    connectedClients,
    pollingActive: pollingInterval !== null,
  };
}
