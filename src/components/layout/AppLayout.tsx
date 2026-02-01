'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginForm } from '../auth/LoginForm';
import { useStore } from '@/store/useStore';

// SSR-safe hydration check
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title = 'Dashboard' }: AppLayoutProps) {
  const {
    isAuthenticated,
    login,
    logout,
    autoRefresh,
    setAutoRefresh,
  } = useStore();

  const [version, setVersion] = useState('');
  const [connected, setConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isHydrated = useHydrated();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/zabbix?action=stats');
        const data = await res.json();
        if (data.success) {
          setVersion(data.data.version);
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    };

    fetchStatus();
  }, [refreshKey]);

  // Show loading state until hydration is complete
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isAuthenticated={isAuthenticated} onLogout={logout} />
      <div className="ml-64">
        <Header
          title={title}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={setAutoRefresh}
          version={version}
          connected={connected}
        />
        <main className="p-6" key={refreshKey}>
          {children}
        </main>
      </div>
    </div>
  );
}
