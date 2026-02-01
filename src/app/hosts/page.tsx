'use client';

import { useEffect, useState, useCallback } from 'react';
import { Server, Wifi, WifiOff, Bell, BellOff, Settings, TrendingUp, Download, FileSpreadsheet, FolderTree } from 'lucide-react';
import { exportToCSV, exportToExcel } from '@/lib/export/exportUtils';
import { AppLayout } from '@/components/layout';
import { DeviceIcon, HostDetailsModal } from '@/components/dashboard';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface Host {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available: string;
  description?: string;
}

interface HostGroup {
  groupid: string;
  name: string;
}

type FilterLevel = 'all' | 'failed_notify' | 'failed_only';

export default function HostsPage() {
  const {
    autoRefresh,
    refreshInterval,
    searchQuery,
    hostFilterLevel,
    setHostFilterLevel,
    hostCustomSettings,
  } = useStore();
  const { t } = useTranslation();

  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  const fetchHostGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/zabbix?action=hostgroups');
      const data = await res.json();
      if (data.success) {
        setHostGroups(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const url = selectedGroupId
        ? `/api/zabbix?action=hosts&groupid=${selectedGroupId}`
        : '/api/zabbix?action=hosts';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHosts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hosts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchHostGroups();
  }, [fetchHostGroups]);

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  // Filter hosts based on filter level
  const filteredHosts = hosts
    .filter((h) => h.status === '0') // Only enabled hosts
    .filter((h) => {
      const settings = hostCustomSettings[h.hostid];
      const isOnline = h.available === '1';
      const hasNotifyEnabled = settings?.notifyEnabled !== false;

      if (hostFilterLevel === 'all') return true;
      if (hostFilterLevel === 'failed_only') return !isOnline;
      if (hostFilterLevel === 'failed_notify') return !isOnline || hasNotifyEnabled;
      return true;
    })
    .filter(
      (h) =>
        !searchQuery ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.host.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const enabledHosts = hosts.filter((h) => h.status === '0');
  const onlineCount = enabledHosts.filter((h) => h.available === '1').length;
  const offlineCount = enabledHosts.filter((h) => h.available !== '1').length;
  const notifyEnabledCount = enabledHosts.filter(
    (h) => hostCustomSettings[h.hostid]?.notifyEnabled !== false
  ).length;

  // Calculate uptime percentage
  const uptimePercent = enabledHosts.length > 0
    ? Math.round((onlineCount / enabledHosts.length) * 100)
    : 0;

  const filterOptions: { value: FilterLevel; label: string; count: number }[] = [
    { value: 'all', label: t.hosts.allHosts, count: enabledHosts.length },
    { value: 'failed_notify', label: t.hosts.failedNotify, count: offlineCount + notifyEnabledCount },
    { value: 'failed_only', label: t.hosts.failedOnly, count: offlineCount },
  ];

  const getHostSettings = (hostId: string) => {
    return hostCustomSettings[hostId] || {
      deviceType: 'default' as const,
      notifyEnabled: true,
    };
  };

  const handleExportCSV = () => {
    const data = filteredHosts.map((host) => {
      const settings = getHostSettings(host.hostid);
      return {
        Name: host.name,
        Hostname: host.host,
        Status: host.available === '1' ? 'Online' : 'Offline',
        DeviceType: settings.deviceType || 'default',
        NotifyEnabled: settings.notifyEnabled !== false ? 'Yes' : 'No',
        Description: host.description || '',
      };
    });
    exportToCSV(data, 'hosts');
  };

  const handleExportExcel = () => {
    const data = filteredHosts.map((host) => {
      const settings = getHostSettings(host.hostid);
      return {
        Name: host.name,
        Hostname: host.host,
        Status: host.available === '1' ? 'Online' : 'Offline',
        DeviceType: settings.deviceType || 'default',
        NotifyEnabled: settings.notifyEnabled !== false ? 'Yes' : 'No',
        Description: host.description || '',
      };
    });
    exportToExcel(data, 'hosts');
  };

  return (
    <AppLayout title={t.hosts.title}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.hosts.totalHosts}</p>
              <p className="text-2xl font-bold text-gray-900">{enabledHosts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.hosts.online}</p>
              <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.hosts.offline}</p>
              <p className="text-2xl font-bold text-red-600">{offlineCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.hosts.uptime}</p>
              <p className="text-2xl font-bold text-purple-600">{uptimePercent}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Host Group Filter */}
        <div className="flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-gray-500" />
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t.common.all}</option>
            {hostGroups.map((group) => (
              <option key={group.groupid} value={group.groupid}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHostFilterLevel(opt.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                hostFilterLevel === opt.value
                  ? opt.value === 'failed_only'
                    ? 'bg-red-500 text-white'
                    : opt.value === 'failed_notify'
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {opt.label}
              <span className="ml-2 text-sm opacity-75">({opt.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Host List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {t.hosts.title}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredHosts.length})
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="text-center py-12">
              <Server className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hosts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHosts.map((host) => {
                const isOnline = host.available === '1';
                const settings = getHostSettings(host.hostid);
                const dependentHost = settings.dependsOn
                  ? hosts.find((h) => h.hostid === settings.dependsOn)
                  : null;

                return (
                  <div
                    key={host.hostid}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isOnline
                        ? 'bg-green-50 border-green-200 hover:border-green-300'
                        : 'bg-red-50 border-red-200 hover:border-red-300'
                    }`}
                    onClick={() => setSelectedHost(host)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOnline ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        <DeviceIcon
                          type={settings.deviceType || 'default'}
                          status={isOnline ? 'online' : 'offline'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {host.name}
                          </h3>
                          <div className="flex items-center gap-1 ml-2">
                            {settings.notifyEnabled !== false ? (
                              <Bell className="w-4 h-4 text-blue-500" />
                            ) : (
                              <BellOff className="w-4 h-4 text-gray-400" />
                            )}
                            <Settings className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{host.host}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isOnline
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                          {dependentHost && (
                            <span className="text-xs text-gray-500">
                              depends on: {dependentHost.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Host Details Modal */}
      {selectedHost && (
        <HostDetailsModal
          host={selectedHost}
          isOpen={!!selectedHost}
          onClose={() => setSelectedHost(null)}
          hosts={hosts}
        />
      )}
    </AppLayout>
  );
}
