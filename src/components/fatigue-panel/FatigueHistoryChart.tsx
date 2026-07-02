'use client';

import { formatJstDate } from '@/lib/date/format';
import { getFatigueColor } from '@/lib/fatigue/colorMap';

interface FatigueHistoryChartProps {
  history: { value: number; recordedAt: string }[];
}

export default function FatigueHistoryChart({ history }: FatigueHistoryChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400">
        記録がありません
      </div>
    );
  }

  const recent = history.slice(0, 7).reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-20">
        {recent.map((entry, i) => {
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{entry.value}%</span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(2, entry.value * 0.6)}px`,
                  backgroundColor: getFatigueColor(entry.value),
                  minHeight: '2px',
                }}
                title={`${formatJstDate(entry.recordedAt)} ${entry.value}%`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {recent.map((entry, i) => {
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-xs text-gray-400">
                {formatJstDate(entry.recordedAt).slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
