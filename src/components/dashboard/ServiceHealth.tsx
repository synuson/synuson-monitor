'use client';

import { Globe, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

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

interface ServiceHealthProps {
  httpTests: HttpTest[];
  isLoading?: boolean;
}

function getStatusInfo(test: HttpTest) {
  // status: 0 = enabled, 1 = disabled
  // lastfailedstep: 0 = OK, >0 = failed step number
  if (test.status === '1') {
    return { status: 'disabled', icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-50' };
  }
  if (test.lastfailedstep === '0') {
    return { status: 'ok', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
  }
  return { status: 'failed', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' };
}

export function ServiceHealth({ httpTests, isLoading }: ServiceHealthProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const enabledTests = httpTests.filter((t) => t.status === '0');
  const healthyCount = enabledTests.filter((t) => t.lastfailedstep === '0').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Service Health</h3>
        </div>
        <span className="text-sm text-gray-500">
          {healthyCount}/{enabledTests.length} healthy
        </span>
      </div>

      {httpTests.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No HTTP tests configured</p>
          <p className="text-sm text-gray-400 mt-1">Configure web monitoring in Zabbix</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {httpTests.map((test) => {
            const { status, icon: StatusIcon, color, bg } = getStatusInfo(test);
            const firstStep = test.steps?.[0];
            const hostName = test.hosts?.[0]?.name || 'Unknown host';

            return (
              <div
                key={test.httptestid}
                className={`p-4 rounded-lg ${bg} border border-current/10`}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{test.name}</p>
                      {status === 'disabled' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{hostName}</span>
                      {firstStep && (
                        <>
                          <span>•</span>
                          <a
                            href={firstStep.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                          >
                            {firstStep.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      status === 'ok'
                        ? 'bg-green-100 text-green-700'
                        : status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {status === 'ok' ? 'OK' : status === 'failed' ? 'Failed' : 'N/A'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
