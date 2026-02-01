/**
 * Anomaly Detection Types
 */

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface MetricBaseline {
  hostId: string;
  itemKey: string;
  itemName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  sampleCount: number;
  lastUpdated: number;
  hourlyPattern?: number[];  // 24개 시간별 평균
  dayOfWeekPattern?: number[]; // 7개 요일별 평균
}

export interface AnomalyScore {
  hostId: string;
  hostName: string;
  itemKey: string;
  itemName: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  zScore: number;
  anomalyScore: number;  // 0-100
  severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  reason: string;
}

export interface AnomalyDetectionResult {
  hostId: string;
  hostName: string;
  totalScore: number;  // 호스트 전체 이상도 점수
  anomalies: AnomalyScore[];
  timestamp: number;
}

export interface AnomalyConfig {
  zScoreThreshold: number;      // Z-Score 임계값 (기본: 3)
  minSampleCount: number;       // 최소 샘플 수 (기본: 30)
  baselineWindowHours: number;  // 베이스라인 윈도우 (기본: 24시간)
  detectionIntervalSeconds: number; // 탐지 주기 (기본: 60초)
  enableTimePattern: boolean;   // 시간대별 패턴 사용
  enableDayPattern: boolean;    // 요일별 패턴 사용
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  zScoreThreshold: 3,
  minSampleCount: 30,
  baselineWindowHours: 24,
  detectionIntervalSeconds: 60,
  enableTimePattern: true,
  enableDayPattern: false,
};

// 모니터링할 메트릭 키
export const MONITORED_METRICS = [
  // CPU
  { key: 'system.cpu.util', name: 'CPU Utilization', unit: '%' },
  { key: 'system.cpu.load[all,avg1]', name: 'CPU Load (1m)', unit: '' },
  { key: 'system.cpu.load[all,avg5]', name: 'CPU Load (5m)', unit: '' },

  // Memory
  { key: 'vm.memory.util', name: 'Memory Utilization', unit: '%' },
  { key: 'vm.memory.size[available]', name: 'Available Memory', unit: 'bytes' },

  // Disk
  { key: 'vfs.fs.size[/,pused]', name: 'Disk Usage /', unit: '%' },
  { key: 'vfs.dev.read.rate', name: 'Disk Read Rate', unit: 'ops/s' },
  { key: 'vfs.dev.write.rate', name: 'Disk Write Rate', unit: 'ops/s' },

  // Network
  { key: 'net.if.in', name: 'Network In', unit: 'bps' },
  { key: 'net.if.out', name: 'Network Out', unit: 'bps' },

  // Process
  { key: 'proc.num', name: 'Process Count', unit: '' },
  { key: 'proc.num[,,run]', name: 'Running Processes', unit: '' },
];
