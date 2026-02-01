import { NextRequest, NextResponse } from 'next/server';
import { ZabbixClient } from '@/lib/zabbix/client';
import { createZabbixClient } from '@/lib/zabbix/config';
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';
import { logger } from '@/lib/logging';

const getClient = createZabbixClient;

/**
 * 캐시를 확인하고 없으면 Zabbix API를 호출하는 헬퍼
 */
async function getCachedOrFetch<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: (client: ZabbixClient) => Promise<T>
): Promise<T> {
  // 1. 캐시 확인
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // 2. Zabbix API 호출
  const client = getClient();
  await client.login();

  try {
    const data = await fetchFn(client);

    // 3. 캐시 저장
    await cacheSet(cacheKey, data, ttl);

    return data;
  } finally {
    await client.logout();
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const noCache = searchParams.get('nocache') === 'true';

  try {
    let data: unknown;
    let cacheKey: string;
    let ttl: number;

    switch (action) {
      case 'hosts':
        const groupId = searchParams.get('groupid') || undefined;
        cacheKey = CACHE_KEYS.HOSTS(groupId);
        ttl = CACHE_TTL.HOSTS;

        if (noCache) {
          const client = getClient();
          await client.login();
          data = groupId ? await client.getHostsByGroup(groupId) : await client.getHosts();
          await client.logout();
          await cacheSet(cacheKey, data, ttl);
        } else {
          data = await getCachedOrFetch(cacheKey, ttl, async (client) => {
            return groupId ? client.getHostsByGroup(groupId) : client.getHosts();
          });
        }
        break;

      case 'hostgroups':
        cacheKey = CACHE_KEYS.HOST_GROUPS;
        ttl = CACHE_TTL.HOST_GROUPS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getHostGroups());
        break;

      case 'problems':
        cacheKey = CACHE_KEYS.PROBLEMS;
        ttl = CACHE_TTL.PROBLEMS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getProblems());
        break;

      case 'triggers':
        cacheKey = CACHE_KEYS.TRIGGERS;
        ttl = CACHE_TTL.TRIGGERS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getTriggers());
        break;

      case 'stats':
        cacheKey = CACHE_KEYS.STATS;
        ttl = CACHE_TTL.STATS;
        data = await getCachedOrFetch(cacheKey, ttl, async (client) => {
          const [hostCount, problemCount, version] = await Promise.all([
            client.getHostCount(),
            client.getProblemCount(),
            client.getApiVersion(),
          ]);
          return { hostCount, problemCount, version };
        });
        break;

      case 'severity-summary':
        cacheKey = CACHE_KEYS.SEVERITY_SUMMARY;
        ttl = CACHE_TTL.SEVERITY_SUMMARY;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getProblemsBySeverity());
        break;

      case 'top-cpu':
        const cpuLimit = parseInt(searchParams.get('limit') || '10');
        cacheKey = CACHE_KEYS.TOP_CPU;
        ttl = CACHE_TTL.TOP_CPU;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getTopCpuHosts(cpuLimit));
        break;

      case 'top-memory':
        const memLimit = parseInt(searchParams.get('limit') || '10');
        cacheKey = CACHE_KEYS.TOP_MEMORY;
        ttl = CACHE_TTL.TOP_MEMORY;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getTopMemoryHosts(memLimit));
        break;

      case 'http-tests':
        cacheKey = CACHE_KEYS.HTTP_TESTS;
        ttl = CACHE_TTL.HTTP_TESTS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getHttpTests());
        break;

      case 'media-types':
        cacheKey = CACHE_KEYS.MEDIA_TYPES;
        ttl = CACHE_TTL.MEDIA_TYPES;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getMediaTypes());
        break;

      case 'actions':
        cacheKey = CACHE_KEYS.ACTIONS;
        ttl = CACHE_TTL.ACTIONS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) => client.getActions());
        break;

      case 'history':
        const itemid = searchParams.get('itemid') || '';
        const historyType = parseInt(searchParams.get('type') || '0');
        const timeFrom = searchParams.get('time_from') || '';
        const timeTill = searchParams.get('time_till') || '';
        const historyLimit = parseInt(searchParams.get('limit') || '100');

        cacheKey = CACHE_KEYS.HISTORY(itemid, timeFrom, timeTill);
        ttl = CACHE_TTL.HISTORY;
        data = await getCachedOrFetch(cacheKey, ttl, (client) =>
          client.getHistory({
            itemids: itemid ? [itemid] : undefined,
            history: historyType,
            time_from: timeFrom ? parseInt(timeFrom) : undefined,
            time_till: timeTill ? parseInt(timeTill) : undefined,
            limit: historyLimit,
          })
        );
        break;

      case 'events':
        const eventsLimit = parseInt(searchParams.get('limit') || '100');
        const eventTimeFrom = searchParams.get('time_from') || '';
        const eventTimeTill = searchParams.get('time_till') || String(Math.floor(Date.now() / 1000));

        cacheKey = CACHE_KEYS.EVENTS(eventTimeFrom, eventTimeTill);
        ttl = CACHE_TTL.EVENTS;
        data = await getCachedOrFetch(cacheKey, ttl, (client) =>
          client.getEvents({
            limit: eventsLimit,
            time_from: eventTimeFrom ? parseInt(eventTimeFrom) : undefined,
          })
        );
        break;

      default:
        // 기본 상태 확인 (캐시 없음)
        const client = getClient();
        await client.login();
        const apiVersion = await client.getApiVersion();
        await client.logout();
        data = { version: apiVersion, status: 'connected' };
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Zabbix API Error', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 캐시 무효화 API
 */
export async function DELETE(request: NextRequest) {
  const { invalidateZabbixCache } = await import('@/lib/cache');
  await invalidateZabbixCache();
  return NextResponse.json({ success: true, message: 'Cache invalidated' });
}
