'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface HistoryChartProps {
  title: string;
  data: DataPoint[];
  unit?: string;
  color?: string;
  isLoading?: boolean;
}

export function HistoryChart({
  title,
  data,
  unit = '',
  color = 'blue',
  isLoading,
}: HistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="animate-pulse">
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const getY = (value: number) => {
    return 100 - ((value - minValue) / range) * 100;
  };

  const pathData = data
    .map((point, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = getY(point.value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${pathData} L 100 100 L 0 100 Z`;

  const latestValue = data[data.length - 1]?.value ?? 0;
  const previousValue = data[data.length - 2]?.value ?? latestValue;
  const change = latestValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

  const colorClasses: Record<string, { line: string; fill: string; text: string }> = {
    blue: { line: 'stroke-blue-500', fill: 'fill-blue-100', text: 'text-blue-600' },
    green: { line: 'stroke-green-500', fill: 'fill-green-100', text: 'text-green-600' },
    red: { line: 'stroke-red-500', fill: 'fill-red-100', text: 'text-red-600' },
    orange: { line: 'stroke-orange-500', fill: 'fill-orange-100', text: 'text-orange-600' },
    purple: { line: 'stroke-purple-500', fill: 'fill-purple-100', text: 'text-purple-600' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {latestValue.toFixed(1)}
            {unit}
          </span>
          {change !== 0 && (
            <span
              className={`flex items-center text-sm ${
                change > 0 ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        {data.length > 0 ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Area fill */}
            <path d={areaPath} className={`${colors.fill} opacity-30`} />
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              className={`${colors.line}`}
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Points */}
            {data.map((point, i) => {
              const x = (i / (data.length - 1 || 1)) * 100;
              const y = getY(point.value);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1"
                  className={`${colors.fill} ${colors.line}`}
                  strokeWidth="0.3"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No data available
          </div>
        )}

        {/* Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
            {new Date(hoveredPoint.timestamp * 1000).toLocaleString('ko-KR')}:{' '}
            {hoveredPoint.value.toFixed(2)}
            {unit}
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {data.length > 0 && (
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{new Date(data[0].timestamp * 1000).toLocaleTimeString('ko-KR')}</span>
          <span>
            {new Date(data[data.length - 1].timestamp * 1000).toLocaleTimeString('ko-KR')}
          </span>
        </div>
      )}
    </div>
  );
}
