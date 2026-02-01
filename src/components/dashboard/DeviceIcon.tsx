'use client';

import {
  Server,
  MonitorCog,
  Network,
  Router,
  Wifi,
  Shield,
  Phone,
  Camera,
  Battery,
  Printer,
  HardDrive,
  Globe,
  Monitor,
} from 'lucide-react';
import { DeviceType } from '@/store/useStore';

interface DeviceIconProps {
  type: DeviceType;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'warning';
  className?: string;
}

const iconMap: Record<DeviceType, typeof Server> = {
  server: Server,
  vserver: MonitorCog,
  switch: Network,
  router: Router,
  wifi: Wifi,
  firewall: Shield,
  ipphone: Phone,
  ipcam: Camera,
  ups: Battery,
  printer: Printer,
  storage: HardDrive,
  web: Globe,
  default: Monitor,
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const statusColors = {
  online: 'text-green-600',
  offline: 'text-red-600',
  warning: 'text-orange-500',
};

export function DeviceIcon({ type, size = 'md', status, className = '' }: DeviceIconProps) {
  const Icon = iconMap[type] || iconMap.default;
  const statusColor = status ? statusColors[status] : 'text-gray-600';

  return <Icon className={`${sizeClasses[size]} ${statusColor} ${className}`} />;
}

// Device type options for dropdown
export const deviceTypeOptions: { value: DeviceType; label: string }[] = [
  { value: 'default', label: 'Default (Monitor)' },
  { value: 'server', label: 'Server' },
  { value: 'vserver', label: 'Virtual Server' },
  { value: 'switch', label: 'Switch' },
  { value: 'router', label: 'Router' },
  { value: 'wifi', label: 'WiFi Router' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'ipphone', label: 'IP Phone' },
  { value: 'ipcam', label: 'IP Camera' },
  { value: 'ups', label: 'UPS' },
  { value: 'printer', label: 'Printer' },
  { value: 'storage', label: 'Storage' },
  { value: 'web', label: 'Web Service' },
];
