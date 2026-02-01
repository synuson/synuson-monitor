'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Calendar,
  Bell,
  Link2,
  Settings,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DeviceIcon, deviceTypeOptions } from './DeviceIcon';
import { HostGraphs } from './HostGraphs';
import { useStore, DeviceType, HostCustomSettings } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

interface Host {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available?: string;
}

interface HostDetailsModalProps {
  host: Host;
  isOpen: boolean;
  onClose: () => void;
  hosts: Host[]; // For dependency dropdown
}

export function HostDetailsModal({ host, isOpen, onClose, hosts }: HostDetailsModalProps) {
  const {
    hostCustomSettings,
    setHostCustomSettings,
    notificationThresholds,
    weekdaySchedule,
  } = useStore();
  const { t } = useTranslation();

  const getDefaultSettings = useMemo(() => (): HostCustomSettings => ({
    hostId: host.hostid,
    useCustomSchedule: false,
    customSchedule: { ...weekdaySchedule },
    useCustomThresholds: false,
    customThresholds: {},
    dependsOn: null,
    deviceType: 'default' as DeviceType,
    notifyEnabled: true,
  }), [host.hostid, weekdaySchedule]);

  // Use a key to reset state when host changes - parent should pass key={host.hostid}
  const [localSettings, setLocalSettings] = useState<HostCustomSettings>(() =>
    hostCustomSettings[host.hostid] || getDefaultSettings()
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSave = () => {
    setHostCustomSettings(host.hostid, localSettings);
    onClose();
  };

  const isOnline = host.available === '1' || host.status === '0';

  const weekdays = [
    { key: 'monday', labelKey: 'mon' },
    { key: 'tuesday', labelKey: 'tue' },
    { key: 'wednesday', labelKey: 'wed' },
    { key: 'thursday', labelKey: 'thu' },
    { key: 'friday', labelKey: 'fri' },
    { key: 'saturday', labelKey: 'sat' },
    { key: 'sunday', labelKey: 'sun' },
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DeviceIcon
              type={localSettings.deviceType}
              size="lg"
              status={isOnline ? 'online' : 'offline'}
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{host.name || host.host}</h2>
              <p className="text-sm text-gray-500">{host.host}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? t.status.online : t.status.offline}
            </div>
            <Activity className={`w-5 h-5 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
          </div>

          {/* Resource Graphs */}
          <HostGraphs hostId={host.hostid} hostName={host.name || host.host} />

          {/* Device Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Server className="w-4 h-4 inline mr-2" />
              {t.hosts.deviceType}
            </label>
            <select
              value={localSettings.deviceType}
              onChange={(e) => setLocalSettings({ ...localSettings, deviceType: e.target.value as DeviceType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {deviceTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">{t.settings.browserNotifications}</p>
                <p className="text-sm text-gray-500">{t.settings.browserNotificationsDesc}</p>
              </div>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, notifyEnabled: !localSettings.notifyEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.notifyEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  localSettings.notifyEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Host Dependency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link2 className="w-4 h-4 inline mr-2" />
              {t.hosts.dependsOn}
            </label>
            <select
              value={localSettings.dependsOn || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, dependsOn: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.hosts.noDependency}</option>
              {hosts.filter(h => h.hostid !== host.hostid).map((h) => (
                <option key={h.hostid} value={h.hostid}>
                  {h.name || h.host}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              If parent host is down, notifications for this host will be suppressed
            </p>
          </div>

          {/* Advanced Settings */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">{t.hosts.customSettings}</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-gray-200 space-y-4">
                {/* Custom Schedule */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="useCustomSchedule"
                      checked={localSettings.useCustomSchedule}
                      onChange={(e) => setLocalSettings({ ...localSettings, useCustomSchedule: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="useCustomSchedule" className="text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Use Custom Notification Schedule
                    </label>
                  </div>

                  {localSettings.useCustomSchedule && (
                    <div className="flex gap-2 flex-wrap ml-6">
                      {weekdays.map((day) => (
                        <button
                          key={day.key}
                          onClick={() => setLocalSettings({
                            ...localSettings,
                            customSchedule: {
                              ...localSettings.customSchedule,
                              [day.key]: !localSettings.customSchedule[day.key]
                            }
                          })}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            localSettings.customSchedule[day.key]
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t.settings.weekdays[day.labelKey]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Thresholds */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="useCustomThresholds"
                      checked={localSettings.useCustomThresholds}
                      onChange={(e) => setLocalSettings({ ...localSettings, useCustomThresholds: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="useCustomThresholds" className="text-sm font-medium text-gray-700">
                      Use Custom Notification Thresholds
                    </label>
                  </div>

                  {localSettings.useCustomThresholds && (
                    <div className="space-y-3 ml-6">
                      {/* CPU Threshold */}
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 w-24">CPU Over</span>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={localSettings.customThresholds.cpuOverloadPercent || notificationThresholds.cpuOverloadPercent}
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            customThresholds: {
                              ...localSettings.customThresholds,
                              cpuOverloadPercent: parseInt(e.target.value) || 90
                            }
                          })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>

                      {/* Memory Threshold */}
                      <div className="flex items-center gap-3">
                        <HardDrive className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 w-24">Memory Below</span>
                        <input
                          type="number"
                          min="100"
                          max="10000"
                          step="100"
                          value={localSettings.customThresholds.memoryLowMB || notificationThresholds.memoryLowMB}
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            customThresholds: {
                              ...localSettings.customThresholds,
                              memoryLowMB: parseInt(e.target.value) || 500
                            }
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                        />
                        <span className="text-sm text-gray-500">MB</span>
                      </div>

                      {/* Response Time Threshold */}
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 w-24">Response Over</span>
                        <input
                          type="number"
                          min="100"
                          max="10000"
                          step="100"
                          value={localSettings.customThresholds.responseTimeMs || notificationThresholds.responseTimeMs}
                          onChange={(e) => setLocalSettings({
                            ...localSettings,
                            customThresholds: {
                              ...localSettings.customThresholds,
                              responseTimeMs: parseInt(e.target.value) || 1000
                            }
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                        />
                        <span className="text-sm text-gray-500">ms</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            {t.settings.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}
