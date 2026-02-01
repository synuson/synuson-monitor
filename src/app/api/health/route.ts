import { NextResponse } from 'next/server';
import { ZabbixClient } from '@/lib/zabbix/client';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    api: 'ok' | 'error';
    zabbix: 'ok' | 'error' | 'unknown';
    database?: 'ok' | 'error' | 'unknown';
  };
  details?: Record<string, unknown>;
}

const startTime = Date.now();

export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      api: 'ok',
      zabbix: 'unknown',
    },
  };

  // Zabbix 연결 확인
  try {
    const client = new ZabbixClient({
      url: process.env.ZABBIX_URL || 'http://localhost:8080',
      user: process.env.ZABBIX_USER || 'Admin',
      password: process.env.ZABBIX_PASSWORD || 'zabbix',
    });

    await client.login();
    const version = await client.getApiVersion();
    await client.logout();

    health.checks.zabbix = 'ok';
    health.details = {
      zabbixVersion: version,
    };
  } catch (error) {
    health.checks.zabbix = 'error';
    health.status = 'degraded';
    health.details = {
      zabbixError: error instanceof Error ? error.message : 'Connection failed',
    };
  }

  // 전체 상태 결정
  const allChecks = Object.values(health.checks);
  if (allChecks.every((c) => c === 'ok')) {
    health.status = 'healthy';
  } else if (allChecks.some((c) => c === 'error')) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
