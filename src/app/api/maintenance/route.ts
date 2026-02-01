/**
 * Maintenance API
 * 점검 시간 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createZabbixClient } from '@/lib/zabbix/config';
import { logger } from '@/lib/logging';
import { z } from 'zod';

const getClient = createZabbixClient;

// 생성/수정 스키마
const maintenanceSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  startTime: z.string().datetime(), // ISO 8601
  endTime: z.string().datetime(),
  hostIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  maintenanceType: z.enum(['withData', 'noData']).default('withData'),
});

/**
 * GET /api/maintenance
 * 점검 시간 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    const hostId = searchParams.get('hostId');

    const client = getClient();
    await client.login();

    const params: Record<string, unknown> = {};

    // 활성 점검만 조회
    if (active === 'true') {
      const now = Math.floor(Date.now() / 1000);
      params.filter = {};
    }

    if (hostId) {
      params.hostids = [hostId];
    }

    const maintenances = await client.getMaintenances(params);

    // 현재 활성 상태 계산
    const now = Math.floor(Date.now() / 1000);
    const formattedMaintenances = maintenances.map((m) => {
      const activeSince = parseInt(m.active_since);
      const activeTill = parseInt(m.active_till);
      const isActive = now >= activeSince && now <= activeTill;
      const isPast = now > activeTill;
      const isFuture = now < activeSince;

      return {
        ...m,
        isActive,
        isPast,
        isFuture,
        status: isActive ? 'active' : isPast ? 'completed' : 'scheduled',
        startTime: new Date(activeSince * 1000).toISOString(),
        endTime: new Date(activeTill * 1000).toISOString(),
        duration: activeTill - activeSince,
        durationText: formatDuration(activeTill - activeSince),
        hostCount: m.hosts?.length || 0,
        groupCount: m.groups?.length || 0,
      };
    });

    // 정렬: 활성 → 예정 → 완료
    formattedMaintenances.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isFuture && b.isPast) return -1;
      if (a.isPast && b.isFuture) return 1;
      return parseInt(b.active_since) - parseInt(a.active_since);
    });

    // 점검 중인 호스트 목록
    const hostsInMaintenance = await client.getHostsInMaintenance();

    await client.logout();

    return NextResponse.json({
      success: true,
      data: {
        maintenances: formattedMaintenances,
        hostsInMaintenance: hostsInMaintenance.map((h) => ({
          hostId: h.hostid,
          hostName: h.name,
          maintenanceFrom: h.maintenance_from
            ? new Date(parseInt(h.maintenance_from) * 1000).toISOString()
            : null,
        })),
        summary: {
          total: formattedMaintenances.length,
          active: formattedMaintenances.filter((m) => m.isActive).length,
          scheduled: formattedMaintenances.filter((m) => m.isFuture).length,
          completed: formattedMaintenances.filter((m) => m.isPast).length,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get maintenances', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/maintenance
 * 점검 시간 생성
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // admin 권한 필요
    if (token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = maintenanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { name, description, startTime, endTime, hostIds, groupIds, maintenanceType } = validation.data;

    // 최소 하나의 호스트 또는 그룹 필요
    if ((!hostIds || hostIds.length === 0) && (!groupIds || groupIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'At least one host or group is required' },
        { status: 400 }
      );
    }

    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

    if (endTimestamp <= startTimestamp) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const client = getClient();
    await client.login();

    const result = await client.createMaintenance({
      name,
      description,
      active_since: startTimestamp,
      active_till: endTimestamp,
      hostids: hostIds,
      groupids: groupIds,
      maintenance_type: maintenanceType === 'noData' ? 1 : 0,
      timeperiods: [
        {
          timeperiod_type: 0, // one time
          start_date: startTimestamp,
          period: endTimestamp - startTimestamp,
        },
      ],
    });

    await client.logout();

    logger.info('Maintenance created', {
      maintenanceId: result.maintenanceids[0],
      name,
      user: token.name || token.sub,
    });

    return NextResponse.json({
      success: true,
      data: {
        maintenanceId: result.maintenanceids[0],
        name,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    logger.error('Failed to create maintenance', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/maintenance?id=xxx
 * 점검 시간 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // admin 권한 필요
    if (token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const maintenanceId = searchParams.get('id');

    if (!maintenanceId) {
      return NextResponse.json(
        { success: false, error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    const client = getClient();
    await client.login();

    const result = await client.deleteMaintenance([maintenanceId]);

    await client.logout();

    logger.info('Maintenance deleted', {
      maintenanceId,
      user: token.name || token.sub,
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedIds: result.maintenanceids,
      },
    });
  } catch (error) {
    logger.error('Failed to delete maintenance', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 시간 포맷팅 헬퍼
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}일 ${remainingHours}시간`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }

  return `${minutes}분`;
}
