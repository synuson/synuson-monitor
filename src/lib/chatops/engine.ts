/**
 * ChatOps Engine
 * 자연어 쿼리를 처리하고 Zabbix API와 연동하여 결과 반환
 */

import { createZabbixClient } from '@/lib/zabbix/config';
import { parseQuery, getHelpMessage, type ParsedQuery, type QueryIntent } from './parser';

// 응답 타입
export interface ChatResponse {
  success: boolean;
  message: string;
  data?: unknown;
  suggestions?: string[];
  type: 'text' | 'table' | 'list' | 'stats' | 'error';
}

// 심각도 이름 매핑
const SEVERITY_NAMES: Record<string, string> = {
  '0': '분류안됨',
  '1': '정보',
  '2': '낮음',
  '3': '경고',
  '4': '높음',
  '5': '재해',
};

// 심각도 이모지
const SEVERITY_EMOJI: Record<string, string> = {
  '0': '⚪',
  '1': '🔵',
  '2': '🟡',
  '3': '🟠',
  '4': '🔴',
  '5': '🟣',
};

// Zabbix 클라이언트 생성
const getClient = createZabbixClient;

// 문제 조회 핸들러
async function handleGetProblems(entities: ParsedQuery['entities']): Promise<ChatResponse> {
  const client = getClient();

  try {
    await client.login();
    const problems = await client.getProblems();
    await client.logout();

    let filtered = problems;

    // 심각도 필터링
    if (entities.severity && entities.severity.length > 0) {
      filtered = filtered.filter((p) => entities.severity!.includes(p.severity));
    }

    // 개수 제한
    const limit = entities.count || 10;
    filtered = filtered.slice(0, limit);

    if (filtered.length === 0) {
      return {
        success: true,
        message: '현재 발생 중인 문제가 없습니다. 🎉',
        type: 'text',
      };
    }

    const problemList = filtered.map((p) => ({
      eventid: p.eventid,
      name: p.name,
      severity: SEVERITY_NAMES[p.severity] || '알 수 없음',
      severityIcon: SEVERITY_EMOJI[p.severity] || '⚪',
      host: p.hosts?.[0]?.name || '알 수 없음',
      time: new Date(parseInt(p.clock) * 1000).toLocaleString('ko-KR'),
    }));

    const summary = `총 ${problems.length}개의 문제 중 ${filtered.length}개를 표시합니다.`;

    return {
      success: true,
      message: summary,
      data: problemList,
      type: 'table',
    };
  } catch (error) {
    return {
      success: false,
      message: `문제 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 호스트 조회 핸들러
async function handleGetHosts(entities: ParsedQuery['entities']): Promise<ChatResponse> {
  const client = getClient();

  try {
    await client.login();
    const hosts = await client.getHosts();
    await client.logout();

    let filtered = hosts.filter((h) => h.status === '0'); // 활성화된 호스트만

    // 상태 필터링
    if (entities.status) {
      if (entities.status === 'online') {
        filtered = filtered.filter((h) => h.available === '1');
      } else if (entities.status === 'offline') {
        filtered = filtered.filter((h) => h.available !== '1');
      }
    }

    // 개수 제한
    const limit = entities.count || 20;
    filtered = filtered.slice(0, limit);

    const hostList = filtered.map((h) => ({
      hostid: h.hostid,
      name: h.name,
      host: h.host,
      status: h.available === '1' ? '🟢 온라인' : '🔴 오프라인',
    }));

    const online = hosts.filter((h) => h.status === '0' && h.available === '1').length;
    const offline = hosts.filter((h) => h.status === '0' && h.available !== '1').length;

    return {
      success: true,
      message: `호스트 현황: 🟢 온라인 ${online}개 | 🔴 오프라인 ${offline}개`,
      data: hostList,
      type: 'table',
    };
  } catch (error) {
    return {
      success: false,
      message: `호스트 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 호스트 상태 핸들러
async function handleGetHostStatus(entities: ParsedQuery['entities']): Promise<ChatResponse> {
  // 특정 호스트 검색이 있으면 그것만, 없으면 전체 상태
  if (entities.hostName) {
    const client = getClient();

    try {
      await client.login();
      const hosts = await client.getHosts();
      await client.logout();

      const found = hosts.find(
        (h) =>
          h.name.toLowerCase().includes(entities.hostName!.toLowerCase()) ||
          h.host.toLowerCase().includes(entities.hostName!.toLowerCase())
      );

      if (!found) {
        return {
          success: false,
          message: `"${entities.hostName}" 호스트를 찾을 수 없습니다.`,
          type: 'error',
          suggestions: ['호스트 목록', '검색 "서버이름"'],
        };
      }

      const status = found.available === '1' ? '🟢 온라인' : '🔴 오프라인';

      return {
        success: true,
        message: `**${found.name}** (${found.host})\n상태: ${status}`,
        data: found,
        type: 'text',
      };
    } catch (error) {
      return {
        success: false,
        message: `상태 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        type: 'error',
      };
    }
  }

  // 전체 상태 요약
  return handleGetHosts(entities);
}

// 서비스 조회 핸들러
async function handleGetServices(entities: ParsedQuery['entities']): Promise<ChatResponse> {
  const client = getClient();

  try {
    await client.login();
    const services = await client.getHttpTests();
    await client.logout();

    const enabled = services.filter((s) => s.status === '0');
    const healthy = enabled.filter((s) => s.lastfailedstep === '0');
    const failed = enabled.filter((s) => s.lastfailedstep !== '0');

    const limit = entities.count || 10;

    const serviceList = enabled.slice(0, limit).map((s) => ({
      name: s.name,
      host: s.hosts?.[0]?.name || '알 수 없음',
      status: s.lastfailedstep === '0' ? '🟢 정상' : '🔴 실패',
    }));

    return {
      success: true,
      message: `서비스 현황: 🟢 정상 ${healthy.length}개 | 🔴 실패 ${failed.length}개`,
      data: serviceList,
      type: 'table',
    };
  } catch (error) {
    return {
      success: false,
      message: `서비스 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 통계 핸들러
async function handleGetStats(): Promise<ChatResponse> {
  const client = getClient();

  try {
    await client.login();

    const [hosts, problems, httpTests] = await Promise.all([
      client.getHosts(),
      client.getProblems(),
      client.getHttpTests(),
    ]);

    await client.logout();

    const enabledHosts = hosts.filter((h) => h.status === '0');
    const onlineHosts = enabledHosts.filter((h) => h.available === '1');
    const enabledServices = httpTests.filter((t) => t.status === '0');
    const healthyServices = enabledServices.filter((t) => t.lastfailedstep === '0');

    // 심각도별 문제 수
    const severityCounts: Record<string, number> = {};
    for (const p of problems) {
      const sev = p.severity || '0';
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
    }

    const stats = {
      hosts: {
        total: enabledHosts.length,
        online: onlineHosts.length,
        offline: enabledHosts.length - onlineHosts.length,
      },
      problems: {
        total: problems.length,
        bySeverity: Object.entries(severityCounts).map(([sev, count]) => ({
          severity: SEVERITY_NAMES[sev],
          icon: SEVERITY_EMOJI[sev],
          count,
        })),
      },
      services: {
        total: enabledServices.length,
        healthy: healthyServices.length,
        failed: enabledServices.length - healthyServices.length,
      },
    };

    const message = `
**📊 시스템 현황**

**호스트**
- 총 ${stats.hosts.total}대
- 🟢 온라인: ${stats.hosts.online}대
- 🔴 오프라인: ${stats.hosts.offline}대

**문제**
- 총 ${stats.problems.total}건
${stats.problems.bySeverity.map((s) => `- ${s.icon} ${s.severity}: ${s.count}건`).join('\n')}

**서비스**
- 총 ${stats.services.total}개
- 🟢 정상: ${stats.services.healthy}개
- 🔴 실패: ${stats.services.failed}개
`.trim();

    return {
      success: true,
      message,
      data: stats,
      type: 'stats',
    };
  } catch (error) {
    return {
      success: false,
      message: `통계 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 유지보수 조회 핸들러
async function handleGetMaintenance(): Promise<ChatResponse> {
  const client = getClient();

  try {
    await client.login();
    const maintenances = await client.getMaintenances();
    await client.logout();

    const now = Math.floor(Date.now() / 1000);
    const active = maintenances.filter(
      (m) => parseInt(m.active_since) <= now && parseInt(m.active_till) >= now
    );

    if (active.length === 0) {
      return {
        success: true,
        message: '현재 진행 중인 유지보수가 없습니다.',
        type: 'text',
      };
    }

    const maintenanceList = active.map((m) => ({
      name: m.name,
      start: new Date(parseInt(m.active_since) * 1000).toLocaleString('ko-KR'),
      end: new Date(parseInt(m.active_till) * 1000).toLocaleString('ko-KR'),
      hosts: m.hosts?.length || 0,
    }));

    return {
      success: true,
      message: `현재 ${active.length}개의 유지보수가 진행 중입니다.`,
      data: maintenanceList,
      type: 'table',
    };
  } catch (error) {
    return {
      success: false,
      message: `유지보수 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 검색 핸들러
async function handleSearch(entities: ParsedQuery['entities']): Promise<ChatResponse> {
  if (!entities.searchTerm) {
    return {
      success: false,
      message: '검색어를 입력해주세요. 예: 검색 "server"',
      type: 'error',
      suggestions: ['검색 "호스트명"', '호스트 목록'],
    };
  }

  const client = getClient();
  const searchTerm = entities.searchTerm.toLowerCase();

  try {
    await client.login();
    const [hosts, problems] = await Promise.all([
      client.getHosts(),
      client.getProblems(),
    ]);
    await client.logout();

    const matchedHosts = hosts.filter(
      (h) =>
        h.name.toLowerCase().includes(searchTerm) ||
        h.host.toLowerCase().includes(searchTerm)
    );

    const matchedProblems = problems.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );

    if (matchedHosts.length === 0 && matchedProblems.length === 0) {
      return {
        success: true,
        message: `"${entities.searchTerm}"에 대한 검색 결과가 없습니다.`,
        type: 'text',
      };
    }

    const results = {
      hosts: matchedHosts.slice(0, 5).map((h) => ({
        type: '호스트',
        name: h.name,
        status: h.available === '1' ? '🟢' : '🔴',
      })),
      problems: matchedProblems.slice(0, 5).map((p) => ({
        type: '문제',
        name: p.name,
        severity: SEVERITY_EMOJI[p.severity] || '⚪',
      })),
    };

    return {
      success: true,
      message: `"${entities.searchTerm}" 검색 결과: 호스트 ${matchedHosts.length}개, 문제 ${matchedProblems.length}개`,
      data: results,
      type: 'list',
    };
  } catch (error) {
    return {
      success: false,
      message: `검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      type: 'error',
    };
  }
}

// 도움말 핸들러
function handleHelp(): ChatResponse {
  return {
    success: true,
    message: getHelpMessage(),
    type: 'text',
  };
}

// 알 수 없는 쿼리 핸들러
function handleUnknown(query: string): ChatResponse {
  return {
    success: false,
    message: `"${query}"를 이해하지 못했습니다.`,
    type: 'error',
    suggestions: [
      '문제 보여줘',
      '호스트 상태',
      '통계',
      '도움말',
    ],
  };
}

// 인텐트별 핸들러 매핑
const INTENT_HANDLERS: Record<QueryIntent, (entities: ParsedQuery['entities'], query: string) => Promise<ChatResponse> | ChatResponse> = {
  get_problems: handleGetProblems,
  get_hosts: handleGetHosts,
  get_host_status: handleGetHostStatus,
  get_services: handleGetServices,
  acknowledge_problem: async () => ({
    success: false,
    message: '문제 확인은 대시보드에서 진행해주세요.',
    type: 'text' as const,
    suggestions: ['/problems 페이지로 이동'],
  }),
  get_stats: handleGetStats,
  get_maintenance: handleGetMaintenance,
  search: handleSearch,
  help: handleHelp,
  unknown: (_, query) => handleUnknown(query),
};

// 메인 엔진 함수
export async function processQuery(query: string): Promise<ChatResponse> {
  const parsed = parseQuery(query);

  // 신뢰도가 낮으면 도움말 제공
  if (parsed.confidence < 0.3 && parsed.intent !== 'help') {
    return {
      success: false,
      message: `"${query}"를 이해하기 어렵습니다.`,
      type: 'error',
      suggestions: [
        '문제 보여줘',
        '호스트 목록',
        '통계',
        '도움말',
      ],
    };
  }

  const handler = INTENT_HANDLERS[parsed.intent];
  return handler(parsed.entities, parsed.originalQuery);
}

export default processQuery;
