'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Server, AlertTriangle, Activity, Wifi, Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  StatsCard,
  ProblemList,
  HostList,
  ProblemSummary,
  ResourceTop,
  ServiceHealth,
  NotificationSettings,
} from '@/components/dashboard';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface Stats {
  hostCount: number;
  problemCount: number;
  version: string;
}

interface Host {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available: string;
}

interface Problem {
  eventid: string;
  name: string;
  severity: string;
  clock: string;
  hosts?: { name: string }[];
}

interface SeverityCounts {
  disaster: number;
  high: number;
  average: number;
  warning: number;
  information: number;
  notClassified: number;
}

interface ResourceItem {
  itemid: string;
  hostid: string;
  name: string;
  key_: string;
  lastvalue: string;
  units: string;
  hosts?: { hostid: string; host: string; name: string }[];
}

interface HttpTest {
  httptestid: string;
  name: string;
  hostid: string;
  status: string;
  lastfailedstep: string;
  hosts?: { hostid: string; host: string; name: string }[];
  steps?: { httpstepid: string; name: string; url: string; status_codes: string; timeout: string }[];
}

interface MediaType {
  mediatypeid: string;
  name: string;
  type: string;
  status: string;
}

interface Action {
  actionid: string;
  name: string;
  status: string;
  eventsource: string;
}

export default function Dashboard() {
  const { autoRefresh, refreshInterval, searchQuery, dashboardWidgets, updateWidget } = useStore();
  const { t } = useTranslation();
  const [isCustomizing, setIsCustomizing] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [severity, setSeverity] = useState<SeverityCounts | null>(null);
  const [cpuItems, setCpuItems] = useState<ResourceItem[]>([]);
  const [memoryItems, setMemoryItems] = useState<ResourceItem[]>([]);
  const [httpTests, setHttpTests] = useState<HttpTest[]>([]);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [
        statsRes,
        hostsRes,
        problemsRes,
        severityRes,
        cpuRes,
        memoryRes,
        httpTestsRes,
        mediaTypesRes,
        actionsRes,
      ] = await Promise.all([
        fetch('/api/zabbix?action=stats'),
        fetch('/api/zabbix?action=hosts'),
        fetch('/api/zabbix?action=problems'),
        fetch('/api/zabbix?action=severity-summary'),
        fetch('/api/zabbix?action=top-cpu&limit=10'),
        fetch('/api/zabbix?action=top-memory&limit=10'),
        fetch('/api/zabbix?action=http-tests'),
        fetch('/api/zabbix?action=media-types'),
        fetch('/api/zabbix?action=actions'),
      ]);

      const [
        statsData,
        hostsData,
        problemsData,
        severityData,
        cpuData,
        memoryData,
        httpTestsData,
        mediaTypesData,
        actionsData,
      ] = await Promise.all([
        statsRes.json(),
        hostsRes.json(),
        problemsRes.json(),
        severityRes.json(),
        cpuRes.json(),
        memoryRes.json(),
        httpTestsRes.json(),
        mediaTypesRes.json(),
        actionsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (hostsData.success) setHosts(hostsData.data);
      if (problemsData.success) setProblems(problemsData.data);
      if (severityData.success) setSeverity(severityData.data);
      if (cpuData.success) setCpuItems(cpuData.data);
      if (memoryData.success) setMemoryItems(memoryData.data);
      if (httpTestsData.success) setHttpTests(httpTestsData.data);
      if (mediaTypesData.success) setMediaTypes(mediaTypesData.data);
      if (actionsData.success) setActions(actionsData.data);

      if (!statsData.success) {
        setError(statsData.error || 'Failed to connect to Zabbix');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  // Filter data based on search query - memoized for performance
  const filteredHosts = useMemo(() =>
    hosts.filter(
      (h) =>
        !searchQuery ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.host.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [hosts, searchQuery]
  );

  const filteredProblems = useMemo(() =>
    problems.filter(
      (p) =>
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hosts?.some((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [problems, searchQuery]
  );

  const { enabledHosts, availableHosts } = useMemo(() => {
    const enabled = filteredHosts.filter((h) => h.status === '0');
    const available = enabled.filter((h) => h.available === '1').length;
    return { enabledHosts: enabled, availableHosts: available };
  }, [filteredHosts]);

  // Widget visibility helper - memoized
  const isWidgetVisible = useCallback((widgetId: string) => {
    const widget = dashboardWidgets.find(w => w.id === widgetId);
    return widget?.visible !== false;
  }, [dashboardWidgets]);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const widget = dashboardWidgets.find(w => w.id === widgetId);
    updateWidget(widgetId, { visible: widget?.visible === false });
  }, [dashboardWidgets, updateWidget]);

  // Widget labels with translations - memoized
  const widgetLabels = useMemo(() => [
    { id: 'problemSummary', label: t.dashboard.problemSummary },
    { id: 'resourceTop', label: t.dashboard.resourceTop },
    { id: 'problemList', label: t.problems.activeProblems },
    { id: 'hostList', label: t.hosts.title },
    { id: 'serviceHealth', label: t.dashboard.serviceHealth },
    { id: 'notifications', label: t.nav.notifications },
  ], [t]);

  return (
    <AppLayout title={t.dashboard.title}>
      {/* Customize Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isCustomizing
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          {isCustomizing ? t.common.close : t.common.edit}
        </button>
      </div>

      {/* Widget Visibility Panel */}
      {isCustomizing && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">{t.dashboard.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {widgetLabels.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidgetVisibility(widget.id)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  isWidgetVisible(widget.id)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {isWidgetVisible(widget.id) ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="text-sm">{widget.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={t.hosts.totalHosts}
          value={isLoading ? '-' : stats?.hostCount || 0}
          icon={Server}
          color="blue"
        />
        <StatsCard
          title={t.hosts.online}
          value={isLoading ? '-' : availableHosts}
          icon={Wifi}
          color="green"
        />
        <StatsCard
          title={t.problems.activeProblems}
          value={isLoading ? '-' : stats?.problemCount || 0}
          icon={AlertTriangle}
          color={stats?.problemCount ? 'red' : 'green'}
        />
        <StatsCard
          title={t.services.title}
          value={isLoading ? '-' : enabledHosts.length}
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Problem Summary */}
      {isWidgetVisible('problemSummary') && (
        <div className="mb-8">
          <ProblemSummary severity={severity} isLoading={isLoading} />
        </div>
      )}

      {/* Resource Usage */}
      {isWidgetVisible('resourceTop') && (
        <div className="mb-8">
          <ResourceTop cpuItems={cpuItems} memoryItems={memoryItems} isLoading={isLoading} />
        </div>
      )}

      {/* Content Grid */}
      {(isWidgetVisible('problemList') || isWidgetVisible('hostList')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {isWidgetVisible('problemList') && (
            <ProblemList problems={filteredProblems} isLoading={isLoading} />
          )}
          {isWidgetVisible('hostList') && (
            <HostList hosts={filteredHosts} isLoading={isLoading} />
          )}
        </div>
      )}

      {/* Service Health & Notifications */}
      {(isWidgetVisible('serviceHealth') || isWidgetVisible('notifications')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetVisible('serviceHealth') && (
            <ServiceHealth httpTests={httpTests} isLoading={isLoading} />
          )}
          {isWidgetVisible('notifications') && (
            <NotificationSettings mediaTypes={mediaTypes} actions={actions} isLoading={isLoading} />
          )}
        </div>
      )}
    </AppLayout>
  );
}
