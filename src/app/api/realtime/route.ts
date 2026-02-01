import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createZabbixClient } from '@/lib/zabbix/config';

export const dynamic = 'force-dynamic';

// Polling endpoint for real-time updates
// Authentication is enforced by middleware, double-check here for safety
export async function GET(request: NextRequest) {
  // Verify authentication
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const client = createZabbixClient();

  try {
    // Authenticate with Zabbix
    await client.login();

    // Fetch all data in parallel (including maintenance info)
    const [hosts, problems, hostCount, problemCount, httpTests, hostsInMaintenance] = await Promise.all([
      client.getHosts(),
      client.getProblems(),
      client.getHostCount(),
      client.getProblemCount(),
      client.getHttpTests(),
      client.getHostsInMaintenance(),
    ]);

    // Cleanup
    await client.logout();

    // Get hostIds in maintenance for filtering
    const maintenanceHostIds = new Set(hostsInMaintenance.map((h) => h.hostid));

    // Calculate derived data
    const enabledHosts = hosts.filter((h) => h.status === '0');
    const onlineHosts = enabledHosts.filter((h) => h.available === '1');
    const offlineHosts = enabledHosts.filter((h) => h.available !== '1');
    const hostsInMaintenanceCount = enabledHosts.filter((h) =>
      maintenanceHostIds.has(h.hostid)
    ).length;

    // Filter problems - exclude hosts in maintenance (suppressed)
    const activeProblems = problems.filter((p) => {
      if (!p.hosts || p.hosts.length === 0) return true;
      // If any host is NOT in maintenance, show the problem
      return p.hosts.some((h) => !maintenanceHostIds.has(h.hostid));
    });

    // Suppressed problems (from hosts in maintenance)
    const suppressedProblems = problems.filter((p) => {
      if (!p.hosts || p.hosts.length === 0) return false;
      return p.hosts.every((h) => maintenanceHostIds.has(h.hostid));
    });

    // Severity counts (active problems only, excluding suppressed)
    const severityCounts = activeProblems.reduce(
      (acc, p) => {
        const severity = p.severity || '0';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Service health
    const enabledServices = httpTests.filter((t) => t.status === '0');
    const healthyServices = enabledServices.filter((t) => t.lastfailedstep === '0');
    const failedServices = enabledServices.filter((t) => t.lastfailedstep !== '0');

    return NextResponse.json({
      success: true,
      data: {
        timestamp: Date.now(),
        stats: {
          hostCount: hostCount,
          problemCount: activeProblems.length, // Only active (non-suppressed) problems
          onlineCount: onlineHosts.length,
          offlineCount: offlineHosts.length,
        },
        hosts: {
          total: enabledHosts.length,
          online: onlineHosts.length,
          offline: offlineHosts.length,
          inMaintenance: hostsInMaintenanceCount,
          offlineList: offlineHosts.slice(0, 10).map((h) => ({
            hostid: h.hostid,
            name: h.name,
            host: h.host,
            inMaintenance: maintenanceHostIds.has(h.hostid),
          })),
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
          failedList: failedServices.slice(0, 5).map((s) => ({
            httptestid: s.httptestid,
            name: s.name,
            hosts: s.hosts,
          })),
        },
        maintenance: {
          hostsInMaintenance: hostsInMaintenanceCount,
          suppressedProblems: suppressedProblems.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}
