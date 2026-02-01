import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  username: string;
  role: 'admin' | 'viewer';
}

// Notification Thresholds
interface NotificationThresholds {
  cpuOverloadEnabled: boolean;
  cpuOverloadPercent: number;
  memoryLowEnabled: boolean;
  memoryLowMB: number;
  diskLowEnabled: boolean;
  diskLowMB: number;
  diskOverloadEnabled: boolean;
  diskOverloadPercent: number;
  networkOverloadEnabled: boolean;
  networkOverloadPercent: number;
  responseTimeEnabled: boolean;
  responseTimeMs: number;
  failsBeforeNotify: number;
}

// Day of week scheduling
interface WeekdaySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

// Host filter level
type HostFilterLevel = 'all' | 'failed_notify' | 'failed_only';

// Device types
export type DeviceType =
  | 'server'
  | 'vserver'
  | 'switch'
  | 'router'
  | 'wifi'
  | 'firewall'
  | 'ipphone'
  | 'ipcam'
  | 'ups'
  | 'printer'
  | 'storage'
  | 'web'
  | 'default';

// Per-host custom settings
export interface HostCustomSettings {
  hostId: string;
  useCustomSchedule: boolean;
  customSchedule: WeekdaySchedule;
  useCustomThresholds: boolean;
  customThresholds: Partial<NotificationThresholds>;
  dependsOn: string | null; // Host dependency
  deviceType: DeviceType;
  notifyEnabled: boolean;
}

// Telegram configuration
interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

// Dashboard widget configuration
export interface DashboardWidget {
  id: string;
  type: 'problemSummary' | 'resourceTop' | 'serviceHealth' | 'notifications' | 'hostList' | 'history';
  title: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

// Language type
type Language = 'ko' | 'en';

// Theme type
type Theme = 'light' | 'dark' | 'system';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Settings
  autoRefresh: boolean;
  refreshInterval: number;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Realtime Updates
  realtimeEnabled: boolean;
  setRealtimeEnabled: (enabled: boolean) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Telegram
  telegramConfig: TelegramConfig;
  setTelegramConfig: (config: Partial<TelegramConfig>) => void;

  // Browser Notifications
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;

  // Dashboard Widgets
  dashboardWidgets: DashboardWidget[];
  setDashboardWidgets: (widgets: DashboardWidget[]) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;

  // Notification Thresholds
  notificationThresholds: NotificationThresholds;
  setNotificationThresholds: (thresholds: Partial<NotificationThresholds>) => void;

  // Weekday Schedule
  weekdaySchedule: WeekdaySchedule;
  setWeekdaySchedule: (schedule: Partial<WeekdaySchedule>) => void;

  // Host Filter
  hostFilterLevel: HostFilterLevel;
  setHostFilterLevel: (level: HostFilterLevel) => void;

  // Per-host settings
  hostCustomSettings: Record<string, HostCustomSettings>;
  setHostCustomSettings: (hostId: string, settings: Partial<HostCustomSettings>) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const defaultThresholds: NotificationThresholds = {
  cpuOverloadEnabled: true,
  cpuOverloadPercent: 90,
  memoryLowEnabled: true,
  memoryLowMB: 500,
  diskLowEnabled: true,
  diskLowMB: 1000,
  diskOverloadEnabled: false,
  diskOverloadPercent: 90,
  networkOverloadEnabled: false,
  networkOverloadPercent: 90,
  responseTimeEnabled: true,
  responseTimeMs: 1000,
  failsBeforeNotify: 3,
};

const defaultWeekdaySchedule: WeekdaySchedule = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

const defaultTelegramConfig: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
};

const defaultDashboardWidgets: DashboardWidget[] = [
  { id: 'problemSummary', type: 'problemSummary', title: 'Problem Summary', visible: true, order: 0, size: 'medium' },
  { id: 'resourceTop', type: 'resourceTop', title: 'Resource Top', visible: true, order: 1, size: 'large' },
  { id: 'problemList', type: 'problemSummary', title: 'Problem List', visible: true, order: 2, size: 'medium' },
  { id: 'hostList', type: 'hostList', title: 'Host List', visible: true, order: 3, size: 'medium' },
  { id: 'serviceHealth', type: 'serviceHealth', title: 'Service Health', visible: true, order: 4, size: 'medium' },
  { id: 'notifications', type: 'notifications', title: 'Notifications', visible: true, order: 5, size: 'small' },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      login: async (username: string, password: string) => {
        // Simple auth - in production, this would call an API
        if (username && password) {
          set({
            isAuthenticated: true,
            user: {
              username,
              role: username === 'admin' ? 'admin' : 'viewer',
            },
          });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },

      // Settings
      autoRefresh: true,
      refreshInterval: 30000,
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),

      // Realtime Updates
      realtimeEnabled: false,
      setRealtimeEnabled: (enabled) => set({ realtimeEnabled: enabled }),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Language
      language: 'ko',
      setLanguage: (language) => set({ language }),

      // Telegram
      telegramConfig: defaultTelegramConfig,
      setTelegramConfig: (config) =>
        set((state) => ({
          telegramConfig: { ...state.telegramConfig, ...config },
        })),

      // Browser Notifications
      browserNotificationsEnabled: false,
      setBrowserNotificationsEnabled: (enabled) => set({ browserNotificationsEnabled: enabled }),

      // Dashboard Widgets
      dashboardWidgets: defaultDashboardWidgets,
      setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
      updateWidget: (id, updates) =>
        set((state) => ({
          dashboardWidgets: state.dashboardWidgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      // Notification Thresholds
      notificationThresholds: defaultThresholds,
      setNotificationThresholds: (thresholds) =>
        set((state) => ({
          notificationThresholds: { ...state.notificationThresholds, ...thresholds },
        })),

      // Weekday Schedule
      weekdaySchedule: defaultWeekdaySchedule,
      setWeekdaySchedule: (schedule) =>
        set((state) => ({
          weekdaySchedule: { ...state.weekdaySchedule, ...schedule },
        })),

      // Host Filter
      hostFilterLevel: 'all',
      setHostFilterLevel: (level) => set({ hostFilterLevel: level }),

      // Per-host settings
      hostCustomSettings: {},
      setHostCustomSettings: (hostId, settings) =>
        set((state) => ({
          hostCustomSettings: {
            ...state.hostCustomSettings,
            [hostId]: {
              ...state.hostCustomSettings[hostId],
              hostId,
              ...settings,
            } as HostCustomSettings,
          },
        })),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // UI State
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'synuson-monitor-storage',
      partialize: (state) => ({
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        realtimeEnabled: state.realtimeEnabled,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        theme: state.theme,
        language: state.language,
        telegramConfig: state.telegramConfig,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        dashboardWidgets: state.dashboardWidgets,
        notificationThresholds: state.notificationThresholds,
        weekdaySchedule: state.weekdaySchedule,
        hostFilterLevel: state.hostFilterLevel,
        hostCustomSettings: state.hostCustomSettings,
      }),
    }
  )
);
