/**
 * Problems API
 * 문제 조회, 확인(ACK), 닫기
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createZabbixClient } from '@/lib/zabbix/config';
import { logger } from '@/lib/logging';
import { z } from 'zod';

const getClient = createZabbixClient;

// 요청 검증 스키마
const acknowledgeSchema = z.object({
  eventIds: z.array(z.string()).min(1, 'At least one eventId is required'),
  action: z.enum(['acknowledge', 'close', 'message']).default('acknowledge'),
  message: z.string().max(2048).optional(),
});

/**
 * GET /api/problems
 * 활성 문제 목록 조회 (확인 여부 포함)
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
    const hostId = searchParams.get('hostId');
    const severity = searchParams.get('severity');
    const acknowledged = searchParams.get('acknowledged');
    const limit = parseInt(searchParams.get('limit') || '100');

    const client = getClient();
    await client.login();

    const params: Record<string, unknown> = {
      output: 'extend',
      selectHosts: ['hostid', 'host', 'name'],
      selectAcknowledges: ['acknowledgeid', 'userid', 'clock', 'message', 'action'],
      sortfield: ['eventid'],
      sortorder: 'DESC',
      limit,
      recent: true,
      suppressed: false,
    };

    if (hostId) {
      params.hostids = [hostId];
    }

    if (severity) {
      params.severities = severity.split(',').map(Number);
    }

    if (acknowledged === 'true') {
      params.acknowledged = true;
    } else if (acknowledged === 'false') {
      params.acknowledged = false;
    }

    const problems = await client.getProblems(params);
    await client.logout();

    // 응답 데이터 가공
    const formattedProblems = problems.map((problem) => ({
      ...problem,
      isAcknowledged: problem.acknowledged === '1',
      acknowledgeCount: Array.isArray(problem.acknowledges) ? problem.acknowledges.length : 0,
      severityName: getSeverityName(problem.severity),
      severityColor: getSeverityColor(problem.severity),
      timestamp: new Date(parseInt(problem.clock) * 1000).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedProblems,
    });
  } catch (error) {
    logger.error('Failed to get problems', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/problems
 * 문제 확인(ACK) / 닫기
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

    // operator 이상 권한 필요
    if (!['admin', 'operator'].includes(token.role as string)) {
      return NextResponse.json(
        { success: false, error: 'Operator access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = acknowledgeSchema.safeParse(body);

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

    const { eventIds, action, message } = validation.data;
    const client = getClient();
    await client.login();

    let result: { eventids: string[] };
    const userName = token.name || token.sub || 'unknown';
    const fullMessage = message
      ? `[${userName}] ${message}`
      : `Acknowledged by ${userName}`;

    switch (action) {
      case 'close':
        result = await client.closeProblem(eventIds, fullMessage);
        logger.info('Problems closed', { eventIds, user: userName });
        break;

      case 'message':
        // 메시지만 추가 (ACK 없이)
        result = await client.acknowledgeEvent(eventIds, 4, fullMessage);
        logger.info('Message added to problems', { eventIds, user: userName });
        break;

      case 'acknowledge':
      default:
        result = await client.acknowledgeProblem(eventIds, fullMessage);
        logger.info('Problems acknowledged', { eventIds, user: userName });
        break;
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      data: {
        action,
        acknowledgedEvents: result.eventids,
        message: fullMessage,
      },
    });
  } catch (error) {
    logger.error('Failed to acknowledge problems', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 심각도 이름
function getSeverityName(severity: string): string {
  const names: Record<string, string> = {
    '0': 'Not classified',
    '1': 'Information',
    '2': 'Warning',
    '3': 'Average',
    '4': 'High',
    '5': 'Disaster',
  };
  return names[severity] || 'Unknown';
}

// 심각도 색상
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    '0': '#97AAB3',
    '1': '#7499FF',
    '2': '#FFC859',
    '3': '#FFA059',
    '4': '#E97659',
    '5': '#E45959',
  };
  return colors[severity] || '#97AAB3';
}
