'use client';

import { useState } from 'react';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  MessageCircle,
  Mail,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
} from 'lucide-react';

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

interface NotificationEditorProps {
  rules: NotificationRule[];
  channels: Channel[];
  onSaveRule: (rule: NotificationRule) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onSaveChannel: (channel: Channel) => Promise<void>;
  onDeleteChannel: (id: string) => Promise<void>;
}

const severityOptions = [
  { value: '5', label: 'Disaster', icon: AlertOctagon, color: 'text-red-600' },
  { value: '4', label: 'High', icon: AlertCircle, color: 'text-orange-600' },
  { value: '3', label: 'Average', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: '2', label: 'Warning', icon: Info, color: 'text-blue-600' },
  { value: '1', label: 'Information', icon: Info, color: 'text-cyan-600' },
];

const channelTypeIcons = {
  telegram: MessageCircle,
  email: Mail,
  sms: Smartphone,
};

export function NotificationEditor({
  rules,
  channels,
  onSaveRule,
  onDeleteRule,
  onSaveChannel,
  onDeleteChannel,
}: NotificationEditorProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'channels'>('rules');
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSaveRule = async () => {
    if (editingRule) {
      await onSaveRule(editingRule);
      setEditingRule(null);
      setIsCreating(false);
    }
  };

  const handleSaveChannel = async () => {
    if (editingChannel) {
      await onSaveChannel(editingChannel);
      setEditingChannel(null);
      setIsCreating(false);
    }
  };

  const createNewRule = () => {
    setEditingRule({
      id: `new-${Date.now()}`,
      name: '',
      enabled: true,
      severity: ['5', '4'],
      channels: [],
    });
    setIsCreating(true);
  };

  const createNewChannel = () => {
    setEditingChannel({
      id: `new-${Date.now()}`,
      name: '',
      type: 'telegram',
      config: {},
      enabled: true,
    });
    setIsCreating(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-4 text-center font-medium transition-colors ${
            activeTab === 'rules'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Alert Rules
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex-1 py-4 text-center font-medium transition-colors ${
            activeTab === 'channels'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Channels
        </button>
      </div>

      <div className="p-6">
        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Notification Rules</h3>
              <button
                onClick={createNewRule}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            {/* Rule Editor Modal */}
            {editingRule && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">
                      {isCreating ? 'Create Rule' : 'Edit Rule'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setIsCreating(false);
                      }}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rule Name
                      </label>
                      <input
                        type="text"
                        value={editingRule.name}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Critical Alerts"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Trigger on Severity
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {severityOptions.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = editingRule.severity.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                const newSeverity = isSelected
                                  ? editingRule.severity.filter((s) => s !== opt.value)
                                  : [...editingRule.severity, opt.value];
                                setEditingRule({ ...editingRule, severity: newSeverity });
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${opt.color}`} />
                              <span className="text-sm">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send to Channels
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {channels.map((channel) => {
                          const Icon = channelTypeIcons[channel.type];
                          const isSelected = editingRule.channels.includes(channel.id);
                          return (
                            <button
                              key={channel.id}
                              onClick={() => {
                                const newChannels = isSelected
                                  ? editingRule.channels.filter((c) => c !== channel.id)
                                  : [...editingRule.channels, channel.id];
                                setEditingRule({ ...editingRule, channels: newChannels });
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{channel.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ruleEnabled"
                        checked={editingRule.enabled}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, enabled: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="ruleEnabled" className="text-sm text-gray-700">
                        Enable this rule
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setIsCreating(false);
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRule}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rules List */}
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notification rules configured</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-lg border ${
                      rule.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {rule.severity.map((sev) => {
                            const opt = severityOptions.find((o) => o.value === sev);
                            if (!opt) return null;
                            const Icon = opt.icon;
                            return (
                              <span
                                key={sev}
                                className={`flex items-center gap-1 text-xs ${opt.color}`}
                              >
                                <Icon className="w-3 h-3" />
                                {opt.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
              <button
                onClick={createNewChannel}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Channel
              </button>
            </div>

            {/* Channel Editor Modal */}
            {editingChannel && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">
                      {isCreating ? 'Add Channel' : 'Edit Channel'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingChannel(null);
                        setIsCreating(false);
                      }}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Channel Name
                      </label>
                      <input
                        type="text"
                        value={editingChannel.name}
                        onChange={(e) =>
                          setEditingChannel({ ...editingChannel, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Ops Team Telegram"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Channel Type
                      </label>
                      <div className="flex gap-2">
                        {(['telegram', 'email', 'sms'] as const).map((type) => {
                          const Icon = channelTypeIcons[type];
                          return (
                            <button
                              key={type}
                              onClick={() =>
                                setEditingChannel({ ...editingChannel, type, config: {} })
                              }
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                editingChannel.type === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="capitalize">{type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Type-specific config */}
                    {editingChannel.type === 'telegram' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bot Token
                        </label>
                        <input
                          type="text"
                          value={editingChannel.config.botToken || ''}
                          onChange={(e) =>
                            setEditingChannel({
                              ...editingChannel,
                              config: { ...editingChannel.config, botToken: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter Telegram Bot Token"
                        />
                        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
                          Chat ID
                        </label>
                        <input
                          type="text"
                          value={editingChannel.config.chatId || ''}
                          onChange={(e) =>
                            setEditingChannel({
                              ...editingChannel,
                              config: { ...editingChannel.config, chatId: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter Chat ID"
                        />
                      </div>
                    )}

                    {editingChannel.type === 'email' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={editingChannel.config.email || ''}
                          onChange={(e) =>
                            setEditingChannel({
                              ...editingChannel,
                              config: { ...editingChannel.config, email: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter email address"
                        />
                      </div>
                    )}

                    {editingChannel.type === 'sms' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={editingChannel.config.phone || ''}
                          onChange={(e) =>
                            setEditingChannel({
                              ...editingChannel,
                              config: { ...editingChannel.config, phone: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+82-10-1234-5678"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="channelEnabled"
                        checked={editingChannel.enabled}
                        onChange={(e) =>
                          setEditingChannel({ ...editingChannel, enabled: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="channelEnabled" className="text-sm text-gray-700">
                        Enable this channel
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => {
                        setEditingChannel(null);
                        setIsCreating(false);
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChannel}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Channels List */}
            <div className="space-y-3">
              {channels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notification channels configured</p>
                </div>
              ) : (
                channels.map((channel) => {
                  const Icon = channelTypeIcons[channel.type];
                  return (
                    <div
                      key={channel.id}
                      className={`p-4 rounded-lg border ${
                        channel.enabled
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              channel.type === 'telegram'
                                ? 'bg-blue-100 text-blue-600'
                                : channel.type === 'email'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{channel.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{channel.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingChannel(channel)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteChannel(channel.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
