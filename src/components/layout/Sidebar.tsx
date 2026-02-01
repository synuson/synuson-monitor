'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Globe,
  Bell,
  Settings,
  History,
  LogOut,
  FileBarChart,
  User,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface SidebarProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export function Sidebar({ isAuthenticated = true, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const menuItems = [
    { href: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/hosts', label: t.nav.hosts, icon: Server },
    { href: '/problems', label: t.nav.problems, icon: AlertTriangle },
    { href: '/services', label: t.nav.services, icon: Globe },
    { href: '/history', label: t.nav.history, icon: History },
    { href: '/reports', label: t.reports.title, icon: FileBarChart },
    { href: '/notifications', label: t.nav.notifications, icon: Bell },
    { href: '/account', label: t.settings.account, icon: User },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">SYNUSON</h1>
            <p className="text-xs text-gray-400">Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {isAuthenticated && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      )}

      <div className="p-4 text-xs text-gray-500 text-center">
        v1.0.0
      </div>
    </aside>
  );
}
