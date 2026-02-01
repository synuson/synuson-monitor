'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Server,
  Folder,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Timer,
  X,
  Loader2,
} from 'lucide-react';

interface Maintenance {
  maintenanceid: string;
  name: string;
  description?: string;
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
  status: 'active' | 'scheduled' | 'completed';
  startTime: string;
  endTime: string;
  duration: number;
  durationText: string;
  hostCount: number;
  groupCount: number;
  hosts?: { hostid: string; name: string }[];
  groups?: { groupid: string; name: string }[];
}

interface HostInMaintenance {
  hostId: string;
  hostName: string;
  maintenanceFrom: string | null;
}

interface MaintenanceData {
  maintenances: Maintenance[];
  hostsInMaintenance: HostInMaintenance[];
  summary: {
    total: number;
    active: number;
    scheduled: number;
    completed: number;
  };
}

interface CreateMaintenanceForm {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  hostIds: string[];
  groupIds: string[];
  maintenanceType: 'withData' | 'noData';
}

export function MaintenanceManager() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hosts, setHosts] = useState<{ hostid: string; name: string }[]>([]);
  const [hostGroups, setHostGroups] = useState<{ groupid: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maintenance');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch maintenance data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHostsAndGroups = useCallback(async () => {
    try {
      const [hostsRes, groupsRes] = await Promise.all([
        fetch('/api/zabbix?action=hosts'),
        fetch('/api/zabbix?action=hostgroups'),
      ]);

      const [hostsData, groupsData] = await Promise.all([
        hostsRes.json(),
        groupsRes.json(),
      ]);

      if (hostsData.success) {
        setHosts(hostsData.data.map((h: { hostid: string; name: string }) => ({
          hostid: h.hostid,
          name: h.name,
        })));
      }

      if (groupsData.success) {
        setHostGroups(groupsData.data.map((g: { groupid: string; name: string }) => ({
          groupid: g.groupid,
          name: g.name,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch hosts/groups', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchHostsAndGroups();
  }, [fetchData, fetchHostsAndGroups]);

  const handleDelete = async (maintenanceId: string, name: string) => {
    if (!confirm(`"${name}" 점검 일정을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/maintenance?id=${maintenanceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchData();
      } else {
        alert(result.error || 'Failed to delete maintenance');
      }
    } catch (err) {
      alert('Failed to delete maintenance');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            진행 중
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            <Timer className="w-3 h-3" />
            예정됨
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            완료됨
          </span>
        );
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-orange-500" />
          점검 시간 관리
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 점검 일정
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.summary.total}
            </div>
            <div className="text-sm text-gray-500">전체 일정</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {data.summary.active}
            </div>
            <div className="text-sm text-green-600">진행 중</div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {data.summary.scheduled}
            </div>
            <div className="text-sm text-blue-600">예정됨</div>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">
              {data.hostsInMaintenance.length}
            </div>
            <div className="text-sm text-orange-600">점검 중 호스트</div>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 점검 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                이름
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                기간
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                대상
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {data?.maintenances.map((m) => (
              <tr key={m.maintenanceid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  {getStatusBadge(m.status)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.name}</div>
                  {m.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {m.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(m.startTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    {m.durationText}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {m.hostCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Server className="w-4 h-4 text-gray-400" />
                        {m.hostCount}
                      </span>
                    )}
                    {m.groupCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-4 h-4 text-gray-400" />
                        {m.groupCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(m.maintenanceid, m.name)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(!data || data.maintenances.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  등록된 점검 일정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 생성 모달 */}
      {showCreateModal && (
        <CreateMaintenanceModal
          hosts={hosts}
          hostGroups={hostGroups}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// 점검 생성 모달
function CreateMaintenanceModal({
  hosts,
  hostGroups,
  onClose,
  onSuccess,
}: {
  hosts: { hostid: string; name: string }[];
  hostGroups: { groupid: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateMaintenanceForm>({
    name: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    hostIds: [],
    groupIds: [],
    maintenanceType: 'withData',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<'hosts' | 'groups'>('hosts');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to create maintenance');
      }
    } catch (err) {
      setError('Failed to create maintenance');
    } finally {
      setLoading(false);
    }
  };

  const toggleHost = (hostId: string) => {
    setForm((prev) => ({
      ...prev,
      hostIds: prev.hostIds.includes(hostId)
        ? prev.hostIds.filter((id) => id !== hostId)
        : [...prev.hostIds, hostId],
    }));
  };

  const toggleGroup = (groupId: string) => {
    setForm((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">새 점검 일정</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium mb-1">점검 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="예: 서버 정기 점검"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="점검 내용을 입력하세요"
            />
          </div>

          {/* 시간 설정 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">시작 시간 *</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">종료 시간 *</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* 점검 타입 */}
          <div>
            <label className="block text-sm font-medium mb-1">점검 유형</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.maintenanceType === 'withData'}
                  onChange={() => setForm({ ...form, maintenanceType: 'withData' })}
                />
                <span>데이터 수집 유지</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.maintenanceType === 'noData'}
                  onChange={() => setForm({ ...form, maintenanceType: 'noData' })}
                />
                <span>데이터 수집 중지</span>
              </label>
            </div>
          </div>

          {/* 대상 선택 */}
          <div>
            <label className="block text-sm font-medium mb-1">대상 선택 *</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setTargetType('hosts')}
                className={`px-3 py-1 rounded ${
                  targetType === 'hosts'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                호스트 ({form.hostIds.length})
              </button>
              <button
                type="button"
                onClick={() => setTargetType('groups')}
                className={`px-3 py-1 rounded ${
                  targetType === 'groups'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                그룹 ({form.groupIds.length})
              </button>
            </div>

            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {targetType === 'hosts' ? (
                hosts.map((host) => (
                  <label
                    key={host.hostid}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.hostIds.includes(host.hostid)}
                      onChange={() => toggleHost(host.hostid)}
                    />
                    <Server className="w-4 h-4 text-gray-400" />
                    {host.name}
                  </label>
                ))
              ) : (
                hostGroups.map((group) => (
                  <label
                    key={group.groupid}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.groupIds.includes(group.groupid)}
                      onChange={() => toggleGroup(group.groupid)}
                    />
                    <Folder className="w-4 h-4 text-gray-400" />
                    {group.name}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || (form.hostIds.length === 0 && form.groupIds.length === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                '점검 일정 생성'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MaintenanceManager;
