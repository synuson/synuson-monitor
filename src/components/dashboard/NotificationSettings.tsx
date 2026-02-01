'use client';

import { useState } from 'react';
import { Bell, Settings, MessageCircle, Mail, Smartphone, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

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

interface NotificationSettingsProps {
  mediaTypes: MediaType[];
  actions: Action[];
  isLoading?: boolean;
}

// Zabbix media type codes
const mediaTypeIcons: Record<string, typeof MessageCircle> = {
  '0': Mail,         // Email
  '1': Mail,         // Script
  '2': Smartphone,   // SMS
  '4': MessageCircle, // Webhook (Telegram, etc.)
};

const mediaTypeLabels: Record<string, string> = {
  '0': 'Email',
  '1': 'Script',
  '2': 'SMS',
  '4': 'Webhook',
};

export function NotificationSettings({ mediaTypes, actions, isLoading }: NotificationSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const enabledMediaTypes = mediaTypes.filter((m) => m.status === '0');
  const enabledActions = actions.filter((a) => a.status === '0');
  const telegramMedia = mediaTypes.find((m) => m.name.toLowerCase().includes('telegram'));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{enabledMediaTypes.length}</div>
          <div className="text-sm text-gray-500">Active Channels</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{enabledActions.length}</div>
          <div className="text-sm text-gray-500">Active Rules</div>
        </div>
      </div>

      {/* Telegram Status */}
      {telegramMedia && (
        <div className={`p-3 rounded-lg mb-4 flex items-center gap-3 ${
          telegramMedia.status === '0' ? 'bg-green-50' : 'bg-gray-50'
        }`}>
          <MessageCircle className={`w-5 h-5 ${
            telegramMedia.status === '0' ? 'text-green-600' : 'text-gray-400'
          }`} />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Telegram</p>
            <p className="text-sm text-gray-500">{telegramMedia.name}</p>
          </div>
          {telegramMedia.status === '0' ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> Enabled
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <X className="w-4 h-4" /> Disabled
            </span>
          )}
        </div>
      )}

      {isExpanded && (
        <>
          {/* Media Types */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Notification Channels
            </h4>
            {mediaTypes.length === 0 ? (
              <p className="text-sm text-gray-500">No media types configured</p>
            ) : (
              <div className="space-y-2">
                {mediaTypes.map((media) => {
                  const Icon = mediaTypeIcons[media.type] || Bell;
                  const isEnabled = media.status === '0';
                  return (
                    <div
                      key={media.mediatypeid}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isEnabled ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-sm text-gray-700">{media.name}</span>
                      <span className="text-xs text-gray-500">
                        {mediaTypeLabels[media.type] || 'Other'}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alert Rules
            </h4>
            {actions.length === 0 ? (
              <p className="text-sm text-gray-500">No actions configured</p>
            ) : (
              <div className="space-y-2">
                {actions.map((action) => {
                  const isEnabled = action.status === '0';
                  return (
                    <div
                      key={action.actionid}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isEnabled ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <Bell className={`w-4 h-4 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-sm text-gray-700">{action.name}</span>
                      <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Configure detailed settings in Zabbix Administration
      </p>
    </div>
  );
}
