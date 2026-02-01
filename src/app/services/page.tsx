'use client';

import { useEffect, useState, useCallback } from 'react';
import { Globe, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface HttpTestStep {
  httpstepid: string;
  name: string;
  url: string;
  status_codes: string;
  timeout: string;
}

interface HttpTest {
  httptestid: string;
  name: string;
  hostid: string;
  status: string;
  lastfailedstep: string;
  hosts?: { hostid: string; host: string; name: string }[];
  steps?: HttpTestStep[];
}

export default function ServicesPage() {
  const { autoRefresh, refreshInterval, searchQuery } = useStore();
  const { t } = useTranslation();
  const [httpTests, setHttpTests] = useState<HttpTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ok' | 'failed'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/zabbix?action=http-tests');
      const data = await res.json();
      if (data.success) {
        setHttpTests(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
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

  const enabledTests = httpTests.filter((t) => t.status === '0');
  const okCount = enabledTests.filter((t) => t.lastfailedstep === '0').length;
  const failedCount = enabledTests.filter((t) => t.lastfailedstep !== '0').length;

  const filteredTests = httpTests
    .filter((t) => t.status === '0')
    .filter((t) => {
      if (filter === 'ok') return t.lastfailedstep === '0';
      if (filter === 'failed') return t.lastfailedstep !== '0';
      return true;
    })
    .filter(
      (t) =>
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.hosts?.some((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <AppLayout title={t.services.title}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.services.totalServices}</p>
              <p className="text-2xl font-bold text-gray-900">{enabledTests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.services.healthy}</p>
              <p className="text-2xl font-bold text-green-600">{okCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.services.failed}</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-200">
          {(['all', 'ok', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                filter === f
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? t.common.all : f === 'ok' ? t.services.healthy : t.services.failed}
              <span className="ml-2 text-sm text-gray-400">
                ({f === 'all' ? enabledTests.length : f === 'ok' ? okCount : failedCount})
              </span>
            </button>
          ))}
        </div>

        {/* Services List */}
        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t.services.noServices}</p>
              <p className="text-sm text-gray-400 mt-1">{t.services.configureInZabbix}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTests.map((test) => {
                const isOk = test.lastfailedstep === '0';
                const firstStep = test.steps?.[0];

                return (
                  <div
                    key={test.httptestid}
                    className={`p-4 rounded-lg border ${
                      isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOk ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {isOk ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{test.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {test.hosts?.[0]?.name || 'Unknown host'}
                            </p>
                            {firstStep && (
                              <a
                                href={firstStep.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                              >
                                {firstStep.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isOk
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isOk ? 'OK' : 'Failed'}
                          </span>
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
    </AppLayout>
  );
}
