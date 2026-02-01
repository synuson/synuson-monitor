'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Search, Bell, User, Moon, Sun, Monitor, Languages } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';
import { RealtimeStatus } from '@/components/dashboard';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefresh?: boolean;
  onAutoRefreshToggle?: (enabled: boolean) => void;
  onSearch?: (query: string) => void;
  version?: string;
  connected?: boolean;
}

export function Header({
  title,
  onRefresh,
  isRefreshing = false,
  autoRefresh = true,
  onAutoRefreshToggle,
  onSearch,
  version,
  connected = true,
}: HeaderProps) {
  const { theme, setTheme, language, setLanguage } = useStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const themeOptions = [
    { value: 'light' as const, label: t.settings.themeLight, icon: Sun },
    { value: 'dark' as const, label: t.settings.themeDark, icon: Moon },
    { value: 'system' as const, label: t.settings.themeSystem, icon: Monitor },
  ];

  const langOptions = [
    { value: 'ko' as const, label: '한국어' },
    { value: 'en' as const, label: 'English' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {version && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Zabbix {version}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {connected ? t.status.online : t.status.offline}
          </span>
        </div>

        {/* Realtime Status */}
        <div className="hidden lg:block">
          <RealtimeStatus showDetails={true} />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {showSearch ? (
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.common.search + '...'}
              className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                onSearch?.('');
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.common.search}
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLangMenu(!showLangMenu);
              setShowThemeMenu(false);
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.settings.language}
          >
            <Languages className="w-5 h-5" />
          </button>
          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {langOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setLanguage(opt.value);
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    language === opt.value ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                  {language === opt.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowLangMenu(false);
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.settings.theme}
          >
            {theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : theme === 'light' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>
          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                      theme === opt.value ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                    {theme === opt.value && <span className="ml-auto">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Auto</span>
          <button
            onClick={() => onAutoRefreshToggle?.(!autoRefresh)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              autoRefresh ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                autoRefresh ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Manual refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          title={t.common.refresh}
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
          title={t.nav.notifications}
        >
          <Bell className="w-5 h-5" />
        </Link>

        {/* User */}
        <Link
          href="/account"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title={t.settings.account}
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
