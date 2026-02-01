'use client';

import { useState } from 'react';
import {
  Settings,
  RefreshCw,
  Bell,
  Shield,
  Database,
  Save,
  Check,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Calendar,
  AlertTriangle,
  Send,
  Radio,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useStore } from '@/store/useStore';

export default function SettingsPage() {
  const {
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    realtimeEnabled,
    setRealtimeEnabled,
    user,
    notificationThresholds,
    setNotificationThresholds,
    weekdaySchedule,
    setWeekdaySchedule,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    telegramConfig,
    setTelegramConfig,
  } = useStore();
  const [saved, setSaved] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const refreshOptions = [
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
  ];

  const weekdays = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
  ] as const;

  return (
    <AppLayout title="Settings">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-500">Configure your monitoring dashboard preferences.</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Refresh Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Refresh Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Auto Refresh</p>
                  <p className="text-sm text-gray-500">
                    Automatically refresh data at regular intervals
                  </p>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      autoRefresh ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Refresh Interval
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!autoRefresh}
                >
                  {refreshOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Realtime Updates */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-green-500" />
                      <p className="font-medium text-gray-900">Realtime Updates (SSE)</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Enable Server-Sent Events for real-time data streaming. Updates every 10 seconds without page refresh.
                    </p>
                  </div>
                  <button
                    onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      realtimeEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        realtimeEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {realtimeEnabled && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    Realtime updates are active. Data will be streamed from the server every 10 seconds.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification Thresholds */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Notification Thresholds</h2>
            </div>

            <div className="space-y-4">
              {/* Fails before notify */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Failures before notification</p>
                  <p className="text-sm text-gray-500">Number of consecutive failures before alerting</p>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={notificationThresholds.failsBeforeNotify}
                  onChange={(e) =>
                    setNotificationThresholds({ failsBeforeNotify: parseInt(e.target.value) || 3 })
                  }
                  className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                />
              </div>

              {/* CPU Overload */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">CPU Overload Alert</p>
                    <p className="text-sm text-gray-500">Notify when CPU exceeds threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={notificationThresholds.cpuOverloadPercent}
                    onChange={(e) =>
                      setNotificationThresholds({ cpuOverloadPercent: parseInt(e.target.value) || 90 })
                    }
                    disabled={!notificationThresholds.cpuOverloadEnabled}
                    className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                  />
                  <span className="text-gray-500">%</span>
                  <button
                    onClick={() =>
                      setNotificationThresholds({
                        cpuOverloadEnabled: !notificationThresholds.cpuOverloadEnabled,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      notificationThresholds.cpuOverloadEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notificationThresholds.cpuOverloadEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Memory Low */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Low Memory Alert</p>
                    <p className="text-sm text-gray-500">Notify when free memory below threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={notificationThresholds.memoryLowMB}
                    onChange={(e) =>
                      setNotificationThresholds({ memoryLowMB: parseInt(e.target.value) || 500 })
                    }
                    disabled={!notificationThresholds.memoryLowEnabled}
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                  />
                  <span className="text-gray-500">MB</span>
                  <button
                    onClick={() =>
                      setNotificationThresholds({
                        memoryLowEnabled: !notificationThresholds.memoryLowEnabled,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      notificationThresholds.memoryLowEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notificationThresholds.memoryLowEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Disk Low */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Low Disk Space Alert</p>
                    <p className="text-sm text-gray-500">Notify when disk space below threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    step="500"
                    value={notificationThresholds.diskLowMB}
                    onChange={(e) =>
                      setNotificationThresholds({ diskLowMB: parseInt(e.target.value) || 1000 })
                    }
                    disabled={!notificationThresholds.diskLowEnabled}
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                  />
                  <span className="text-gray-500">MB</span>
                  <button
                    onClick={() =>
                      setNotificationThresholds({
                        diskLowEnabled: !notificationThresholds.diskLowEnabled,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      notificationThresholds.diskLowEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notificationThresholds.diskLowEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Network Overload */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Network Overload Alert</p>
                    <p className="text-sm text-gray-500">Notify when network exceeds threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={notificationThresholds.networkOverloadPercent}
                    onChange={(e) =>
                      setNotificationThresholds({
                        networkOverloadPercent: parseInt(e.target.value) || 90,
                      })
                    }
                    disabled={!notificationThresholds.networkOverloadEnabled}
                    className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                  />
                  <span className="text-gray-500">%</span>
                  <button
                    onClick={() =>
                      setNotificationThresholds({
                        networkOverloadEnabled: !notificationThresholds.networkOverloadEnabled,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      notificationThresholds.networkOverloadEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notificationThresholds.networkOverloadEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Response Time */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Response Time Alert</p>
                    <p className="text-sm text-gray-500">Notify when response time exceeds threshold</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={notificationThresholds.responseTimeMs}
                    onChange={(e) =>
                      setNotificationThresholds({ responseTimeMs: parseInt(e.target.value) || 1000 })
                    }
                    disabled={!notificationThresholds.responseTimeEnabled}
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-center disabled:bg-gray-100"
                  />
                  <span className="text-gray-500">ms</span>
                  <button
                    onClick={() =>
                      setNotificationThresholds({
                        responseTimeEnabled: !notificationThresholds.responseTimeEnabled,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      notificationThresholds.responseTimeEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notificationThresholds.responseTimeEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Weekday Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Notification Schedule</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select days when notifications should be sent
            </p>

            <div className="flex gap-2 flex-wrap">
              {weekdays.map((day) => (
                <button
                  key={day.key}
                  onClick={() =>
                    setWeekdaySchedule({ [day.key]: !weekdaySchedule[day.key] })
                  }
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    weekdaySchedule[day.key]
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Browser Notifications</p>
                  <p className="text-sm text-gray-500">
                    Receive alerts in your browser
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!browserNotificationsEnabled) {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        setBrowserNotificationsEnabled(true);
                      }
                    } else {
                      setBrowserNotificationsEnabled(false);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    browserNotificationsEnabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      browserNotificationsEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Sound Alerts</p>
                  <p className="text-sm text-gray-500">
                    Play sound for critical alerts
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Toggle sound - could add soundEnabled state
                  }}
                  className="relative w-12 h-6 rounded-full bg-gray-300 transition-colors"
                >
                  <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
                </button>
              </div>
            </div>
          </div>

          {/* Telegram Integration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Telegram Integration</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable Telegram Notifications</p>
                  <p className="text-sm text-gray-500">
                    Send alerts to Telegram chat
                  </p>
                </div>
                <button
                  onClick={() => setTelegramConfig({ enabled: !telegramConfig.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    telegramConfig.enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      telegramConfig.enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">Bot Token</label>
                <input
                  type="password"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ botToken: e.target.value })}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get from @BotFather on Telegram
                </p>
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">Chat ID</label>
                <input
                  type="text"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig({ chatId: e.target.value })}
                  placeholder="-1001234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use @userinfobot to get your chat ID
                </p>
              </div>

              <button
                onClick={async () => {
                  if (telegramConfig.botToken && telegramConfig.chatId) {
                    setTestingTelegram(true);
                    try {
                      const res = await fetch('/api/telegram/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          botToken: telegramConfig.botToken,
                          chatId: telegramConfig.chatId,
                        }),
                      });
                      const data = await res.json();
                      alert(data.success ? 'Test notification sent!' : 'Failed: ' + data.error);
                    } catch {
                      alert('Failed to send test notification');
                    } finally {
                      setTestingTelegram(false);
                    }
                  }
                }}
                disabled={!telegramConfig.botToken || !telegramConfig.chatId || testingTelegram}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {testingTelegram ? 'Sending...' : 'Send Test Notification'}
              </button>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-900 mb-2">Username</label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 capitalize"
                />
              </div>
            </div>
          </div>

          {/* Connection Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Zabbix Connection</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-900 mb-2">Server URL</label>
                <input
                  type="text"
                  value={process.env.NEXT_PUBLIC_ZABBIX_URL || 'Configured in .env'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Configure in .env.local file (ZABBIX_URL)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
