'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { NotificationEditor } from '@/components/dashboard';
import { useTranslation } from '@/lib/i18n';

interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: string[];
  channels: string[];
}

interface Channel {
  id: string;
  name: string;
  type: 'telegram' | 'email' | 'sms';
  config: Record<string, string>;
  enabled: boolean;
}

// Local storage keys
const RULES_KEY = 'synuson-notification-rules';
const CHANNELS_KEY = 'synuson-notification-channels';

export default function NotificationsPage() {
  const { t, language } = useTranslation();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from local storage
    try {
      const savedRules = localStorage.getItem(RULES_KEY);
      const savedChannels = localStorage.getItem(CHANNELS_KEY);

      if (savedRules) {
        setRules(JSON.parse(savedRules));
      } else {
        // Default rules
        setRules([
          {
            id: '1',
            name: 'Critical Alerts',
            enabled: true,
            severity: ['5', '4'],
            channels: ['1'],
          },
          {
            id: '2',
            name: 'All Alerts',
            enabled: false,
            severity: ['5', '4', '3', '2', '1'],
            channels: ['1'],
          },
        ]);
      }

      if (savedChannels) {
        setChannels(JSON.parse(savedChannels));
      } else {
        // Default channels
        setChannels([
          {
            id: '1',
            name: 'Ops Team',
            type: 'telegram',
            config: { botToken: '', chatId: '' },
            enabled: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveRules = useCallback((newRules: NotificationRule[]) => {
    setRules(newRules);
    localStorage.setItem(RULES_KEY, JSON.stringify(newRules));
  }, []);

  const saveChannels = useCallback((newChannels: Channel[]) => {
    setChannels(newChannels);
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(newChannels));
  }, []);

  const handleSaveRule = async (rule: NotificationRule) => {
    const existingIndex = rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      const newRules = [...rules];
      newRules[existingIndex] = rule;
      saveRules(newRules);
    } else {
      saveRules([...rules, { ...rule, id: Date.now().toString() }]);
    }
  };

  const handleDeleteRule = async (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  const handleSaveChannel = async (channel: Channel) => {
    const existingIndex = channels.findIndex((c) => c.id === channel.id);
    if (existingIndex >= 0) {
      const newChannels = [...channels];
      newChannels[existingIndex] = channel;
      saveChannels(newChannels);
    } else {
      saveChannels([...channels, { ...channel, id: Date.now().toString() }]);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    saveChannels(channels.filter((c) => c.id !== id));
  };

  if (isLoading) {
    return (
      <AppLayout title={t.nav.notifications}>
        <div className="animate-pulse">
          <div className="h-96 bg-gray-100 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t.nav.notifications}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t.nav.notifications}</h1>
        </div>
        <p className="text-gray-500">
          {language === 'ko'
            ? '모니터링 시스템에서 알림을 받는 방법과 시기를 설정합니다.'
            : 'Configure how and when you receive alerts from your monitoring system.'}
        </p>
      </div>

      {/* Notification Editor */}
      <NotificationEditor
        rules={rules}
        channels={channels}
        onSaveRule={handleSaveRule}
        onDeleteRule={handleDeleteRule}
        onSaveChannel={handleSaveChannel}
        onDeleteChannel={handleDeleteChannel}
      />

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">
          {language === 'ko' ? '연동 안내' : 'Integration Note'}
        </h3>
        <p className="text-sm text-blue-700">
          {language === 'ko'
            ? '이 알림 설정은 로컬에 저장됩니다. 실제 운영 환경에서는 Zabbix 관리 > 미디어 유형 및 액션에서 알림을 설정하세요.'
            : 'These notification settings are stored locally. For production use, configure notifications directly in Zabbix Administration > Media types and Actions.'}
        </p>
      </div>
    </AppLayout>
  );
}
