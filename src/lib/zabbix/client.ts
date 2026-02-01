import axios, { AxiosInstance } from 'axios';

export interface ZabbixConfig {
  url: string;
  user: string;
  password: string;
}

export interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available: string;
  description?: string;
  maintenance_status?: string;
  maintenance_from?: string;
}

export interface ZabbixProblem {
  eventid: string;
  objectid: string;
  clock: string;
  name: string;
  severity: string;
  acknowledged: string;
  hosts?: ZabbixHost[];
  acknowledges?: {
    acknowledgeid: string;
    userid: string;
    clock: string;
    message: string;
    action: string;
  }[];
}

export interface ZabbixTrigger {
  triggerid: string;
  description: string;
  priority: string;
  value: string;
  lastchange: string;
  hosts?: ZabbixHost[];
}

export interface ZabbixItem {
  itemid: string;
  hostid: string;
  name: string;
  key_: string;
  lastvalue: string;
  units: string;
  hosts?: ZabbixHost[];
}

export interface ZabbixHttpTest {
  httptestid: string;
  name: string;
  hostid: string;
  status: string;
  lastfailedstep: string;
  lastvalue?: string;
  hosts?: ZabbixHost[];
  steps?: ZabbixHttpTestStep[];
}

export interface ZabbixHttpTestStep {
  httpstepid: string;
  name: string;
  url: string;
  status_codes: string;
  timeout: string;
}

export interface ZabbixMediaType {
  mediatypeid: string;
  name: string;
  type: string;
  status: string;
}

export interface ZabbixAction {
  actionid: string;
  name: string;
  status: string;
  eventsource: string;
}

export interface ZabbixMaintenance {
  maintenanceid: string;
  name: string;
  description?: string;
  active_since: string;
  active_till: string;
  maintenance_type: string; // 0: with data, 1: no data
  hosts?: ZabbixHost[];
  groups?: { groupid: string; name: string }[];
  timeperiods?: {
    timeperiodid: string;
    timeperiod_type: string;
    start_date: string;
    period: string;
  }[];
}

export interface ZabbixHostGroup {
  groupid: string;
  name: string;
  internal?: string;
  hosts?: ZabbixHost[];
}

export interface SeverityCounts {
  disaster: number;
  high: number;
  average: number;
  warning: number;
  information: number;
  notClassified: number;
}

export class ZabbixClient {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private config: ZabbixConfig;
  private requestId = 1;

  constructor(config: ZabbixConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.url,
      headers: {
        'Content-Type': 'application/json-rpc',
      },
    });
  }

  async request<T>(method: string, params: Record<string, unknown> | string[] = {}): Promise<T> {
    // Methods that should not include auth parameter
    const noAuthMethods = ['apiinfo.version', 'user.login'];

    const payload: Record<string, unknown> = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId++,
    };

    // Only include auth for methods that require it
    if (!noAuthMethods.includes(method) && this.authToken) {
      payload.auth = this.authToken;
    }

    const response = await this.client.post('/api_jsonrpc.php', payload);

    if (response.data.error) {
      throw new Error(response.data.error.data || response.data.error.message);
    }

    return response.data.result;
  }

  async login(): Promise<string> {
    const result = await this.request<string>('user.login', {
      username: this.config.user,
      password: this.config.password,
    });
    this.authToken = result;
    return result;
  }

  async logout(): Promise<void> {
    if (this.authToken) {
      await this.request('user.logout', {});
      this.authToken = null;
    }
  }

  async getHosts(params: Record<string, unknown> = {}): Promise<ZabbixHost[]> {
    return this.request<ZabbixHost[]>('host.get', {
      output: ['hostid', 'host', 'name', 'status', 'available', 'description'],
      ...params,
    });
  }

  async getHostGroups(params: Record<string, unknown> = {}): Promise<ZabbixHostGroup[]> {
    return this.request<ZabbixHostGroup[]>('hostgroup.get', {
      output: ['groupid', 'name'],
      ...params,
    });
  }

  async getHostsByGroup(groupId: string): Promise<ZabbixHost[]> {
    return this.request<ZabbixHost[]>('host.get', {
      output: ['hostid', 'host', 'name', 'status', 'available', 'description'],
      groupids: [groupId],
    });
  }

  async getProblems(params: Record<string, unknown> = {}): Promise<ZabbixProblem[]> {
    const problems = await this.request<ZabbixProblem[]>('problem.get', {
      output: 'extend',
      recent: true,
      sortfield: ['eventid'],
      sortorder: 'DESC',
      ...params,
    });

    // Fetch host info for each problem's objectid (trigger)
    if (problems.length > 0) {
      const triggerIds = [...new Set(problems.map((p) => p.objectid))];

      try {
        // Try with selectHosts first (newer Zabbix versions)
        const triggers = await this.request<{ triggerid: string; hosts: ZabbixHost[] }[]>('trigger.get', {
          triggerids: triggerIds,
          output: ['triggerid'],
          selectHosts: ['hostid', 'host', 'name'],
        });

        const triggerHostMap = new Map<string, ZabbixHost[]>();
        triggers.forEach((t) => {
          triggerHostMap.set(t.triggerid, t.hosts);
        });

        problems.forEach((problem) => {
          problem.hosts = triggerHostMap.get(problem.objectid);
        });
      } catch {
        // Fallback: skip host info if selectHosts is not supported
        console.warn('selectHosts not supported in trigger.get, skipping host info');
      }
    }

    return problems;
  }

  async getTriggers(params: Record<string, unknown> = {}): Promise<ZabbixTrigger[]> {
    try {
      // Try with selectHosts first (newer Zabbix versions)
      return await this.request<ZabbixTrigger[]>('trigger.get', {
        output: ['triggerid', 'description', 'priority', 'value', 'lastchange'],
        selectHosts: ['hostid', 'host', 'name'],
        filter: { value: 1 },
        sortfield: 'priority',
        sortorder: 'DESC',
        ...params,
      });
    } catch {
      // Fallback without selectHosts
      return await this.request<ZabbixTrigger[]>('trigger.get', {
        output: ['triggerid', 'description', 'priority', 'value', 'lastchange'],
        filter: { value: 1 },
        sortfield: 'priority',
        sortorder: 'DESC',
        ...params,
      });
    }
  }

  async getHostCount(): Promise<number> {
    const hosts = await this.request<{ rowscount: string }[]>('host.get', {
      countOutput: true,
    });
    return parseInt(hosts as unknown as string, 10);
  }

  async getProblemCount(): Promise<number> {
    const problems = await this.request<string>('problem.get', {
      countOutput: true,
      recent: true,
    });
    return parseInt(problems, 10);
  }

  async getApiVersion(): Promise<string> {
    return this.request<string>('apiinfo.version', {});
  }

  // 오늘 장애 요약: 심각도별 집계
  async getProblemsBySeverity(): Promise<SeverityCounts> {
    const problems = await this.getProblems();
    const counts: SeverityCounts = {
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      notClassified: 0,
    };

    problems.forEach((problem) => {
      switch (problem.severity) {
        case '5': counts.disaster++; break;
        case '4': counts.high++; break;
        case '3': counts.average++; break;
        case '2': counts.warning++; break;
        case '1': counts.information++; break;
        default: counts.notClassified++; break;
      }
    });

    return counts;
  }

  // CPU/메모리 Top N: 시스템 메트릭 조회
  async getItems(params: Record<string, unknown> = {}): Promise<ZabbixItem[]> {
    const items = await this.request<ZabbixItem[]>('item.get', {
      output: ['itemid', 'hostid', 'name', 'key_', 'lastvalue', 'units'],
      ...params,
    });

    // Fetch host info separately
    if (items.length > 0) {
      const hostIds = [...new Set(items.map((i) => i.hostid))];
      const hosts = await this.request<ZabbixHost[]>('host.get', {
        hostids: hostIds,
        output: ['hostid', 'host', 'name'],
      });

      const hostMap = new Map<string, ZabbixHost>();
      hosts.forEach((h) => hostMap.set(h.hostid, h));

      items.forEach((item) => {
        const host = hostMap.get(item.hostid);
        if (host) {
          item.hosts = [host];
        }
      });
    }

    return items;
  }

  async getTopCpuHosts(limit: number = 10): Promise<ZabbixItem[]> {
    const items = await this.getItems({
      search: { key_: 'system.cpu.util' },
    });
    // Sort by lastvalue descending in JavaScript
    return items
      .sort((a, b) => parseFloat(b.lastvalue || '0') - parseFloat(a.lastvalue || '0'))
      .slice(0, limit);
  }

  async getTopMemoryHosts(limit: number = 10): Promise<ZabbixItem[]> {
    const items = await this.getItems({
      search: { key_: 'vm.memory.util' },
    });
    // Sort by lastvalue descending in JavaScript
    return items
      .sort((a, b) => parseFloat(b.lastvalue || '0') - parseFloat(a.lastvalue || '0'))
      .slice(0, limit);
  }

  // 서비스 헬스: HTTP 테스트 조회
  async getHttpTests(params: Record<string, unknown> = {}): Promise<ZabbixHttpTest[]> {
    try {
      // Try with selectHosts/selectSteps first (newer Zabbix versions)
      return await this.request<ZabbixHttpTest[]>('httptest.get', {
        output: 'extend',
        selectHosts: ['hostid', 'host', 'name'],
        selectSteps: ['httpstepid', 'name', 'url', 'status_codes', 'timeout'],
        ...params,
      });
    } catch {
      // Fallback for older versions without selectHosts
      const httpTests = await this.request<ZabbixHttpTest[]>('httptest.get', {
        output: 'extend',
        ...params,
      });

      // Fetch host info separately
      if (httpTests.length > 0) {
        const hostIds = [...new Set(httpTests.map((t) => t.hostid))];
        const hosts = await this.request<ZabbixHost[]>('host.get', {
          hostids: hostIds,
          output: ['hostid', 'host', 'name'],
        });

        const hostMap = new Map<string, ZabbixHost>();
        hosts.forEach((h) => hostMap.set(h.hostid, h));

        httpTests.forEach((test) => {
          const host = hostMap.get(test.hostid);
          if (host) {
            test.hosts = [host];
          }
        });
      }

      return httpTests;
    }
  }

  // 알림 설정: 미디어 타입 조회
  async getMediaTypes(params: Record<string, unknown> = {}): Promise<ZabbixMediaType[]> {
    return this.request<ZabbixMediaType[]>('mediatype.get', {
      output: ['mediatypeid', 'name', 'type', 'status'],
      ...params,
    });
  }

  // 알림 설정: 액션 조회
  async getActions(params: Record<string, unknown> = {}): Promise<ZabbixAction[]> {
    return this.request<ZabbixAction[]>('action.get', {
      output: ['actionid', 'name', 'status', 'eventsource'],
      ...params,
    });
  }

  // 히스토리 조회
  async getHistory(params: Record<string, unknown> = {}): Promise<{ clock: string; value: string }[]> {
    return this.request<{ clock: string; value: string }[]>('history.get', {
      output: ['clock', 'value'],
      sortfield: 'clock',
      sortorder: 'ASC',
      ...params,
    });
  }

  // 이벤트 히스토리 조회
  async getEvents(params: Record<string, unknown> = {}): Promise<{
    eventid: string;
    clock: string;
    name: string;
    severity: string;
    value: string;
  }[]> {
    return this.request('event.get', {
      output: ['eventid', 'clock', 'name', 'severity', 'value'],
      sortfield: 'clock',
      sortorder: 'DESC',
      ...params,
    });
  }

  isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  // ============================================
  // 문제 확인 (Acknowledgment)
  // ============================================

  /**
   * 이벤트/문제 확인 처리
   * @param eventIds 이벤트 ID 배열
   * @param action 액션 비트마스크 (1=close, 2=ack, 4=add message, 8=change severity)
   * @param message 확인 메시지
   */
  async acknowledgeEvent(
    eventIds: string[],
    action: number = 6, // 2 (ack) + 4 (message)
    message?: string
  ): Promise<{ eventids: string[] }> {
    const params: Record<string, unknown> = {
      eventids: eventIds,
      action,
    };

    if (message) {
      params.message = message;
    }

    return this.request<{ eventids: string[] }>('event.acknowledge', params);
  }

  /**
   * 문제 닫기
   */
  async closeProblem(eventIds: string[], message?: string): Promise<{ eventids: string[] }> {
    return this.acknowledgeEvent(eventIds, message ? 5 : 1, message); // 1=close, 4=message
  }

  /**
   * 문제 확인만 (닫지 않음)
   */
  async acknowledgeProblem(eventIds: string[], message?: string): Promise<{ eventids: string[] }> {
    return this.acknowledgeEvent(eventIds, message ? 6 : 2, message); // 2=ack, 4=message
  }

  // ============================================
  // 점검 시간 (Maintenance)
  // ============================================

  /**
   * 점검 시간 목록 조회
   */
  async getMaintenances(params: Record<string, unknown> = {}): Promise<ZabbixMaintenance[]> {
    return this.request<ZabbixMaintenance[]>('maintenance.get', {
      output: 'extend',
      selectHosts: ['hostid', 'host', 'name'],
      selectGroups: ['groupid', 'name'],
      selectTimeperiods: 'extend',
      ...params,
    });
  }

  /**
   * 점검 시간 생성
   */
  async createMaintenance(params: {
    name: string;
    description?: string;
    active_since: number;
    active_till: number;
    hostids?: string[];
    groupids?: string[];
    maintenance_type?: 0 | 1; // 0: with data, 1: no data
    tags_evaltype?: 0 | 2; // 0: And/Or, 2: Or
    timeperiods: {
      timeperiod_type?: 0 | 2 | 3 | 4; // 0: one time, 2: daily, 3: weekly, 4: monthly
      start_date?: number;
      period: number; // duration in seconds
    }[];
  }): Promise<{ maintenanceids: string[] }> {
    return this.request<{ maintenanceids: string[] }>('maintenance.create', params);
  }

  /**
   * 점검 시간 수정
   */
  async updateMaintenance(
    maintenanceId: string,
    params: Record<string, unknown>
  ): Promise<{ maintenanceids: string[] }> {
    return this.request<{ maintenanceids: string[] }>('maintenance.update', {
      maintenanceid: maintenanceId,
      ...params,
    });
  }

  /**
   * 점검 시간 삭제
   */
  async deleteMaintenance(maintenanceIds: string[]): Promise<{ maintenanceids: string[] }> {
    return this.request<{ maintenanceids: string[] }>('maintenance.delete', maintenanceIds);
  }

  /**
   * 현재 활성 점검 중인 호스트 확인
   */
  async getHostsInMaintenance(): Promise<ZabbixHost[]> {
    return this.request<ZabbixHost[]>('host.get', {
      output: ['hostid', 'host', 'name', 'maintenance_status', 'maintenance_from'],
      filter: { maintenance_status: 1 },
    });
  }
}

// Singleton instance for client-side usage
let clientInstance: ZabbixClient | null = null;

export function getZabbixClient(config: ZabbixConfig): ZabbixClient {
  if (!clientInstance) {
    clientInstance = new ZabbixClient(config);
  }
  return clientInstance;
}
