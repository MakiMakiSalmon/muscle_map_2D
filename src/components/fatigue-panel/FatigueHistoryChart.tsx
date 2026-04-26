'use client';

import { formatJstDate } from '@/lib/date/format';
import type { FatigueSnapshot } from '@/types/domain';

interface FatigueHistoryChartProps {
  history: Pick<FatigueSnapshot, 'value' | 'recordedAt'>[];
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

  const getBarColor = (value: number): string => {
    if (value === 0) return '#dddddd';
    if (value < 30) return '#90ee90';
    if (value < 60) return '#ffd700';
    if (value < 80) return '#ff8c00';
    return '#ff4500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-20">
        {recent.map((entry, i) => {
          const recordedAt = entry.recordedAt instanceof Date
            ? entry.recordedAt
            : new Date(entry.recordedAt as unknown as string);
          const heightPct = entry.value;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{entry.value}%</span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(2, heightPct * 0.6)}px`,
                  backgroundColor: getBarColor(entry.value),
                  minHeight: '2px',
                }}
                title={`${formatJstDate(recordedAt.toISOString())} ${entry.value}%`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {recent.map((entry, i) => {
          const recordedAt = entry.recordedAt instanceof Date
            ? entry.recordedAt
            : new Date(entry.recordedAt as unknown as string);
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-xs text-gray-400">
                {formatJstDate(recordedAt.toISOString()).slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
