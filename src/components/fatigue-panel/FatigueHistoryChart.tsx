'use client';

import { formatJstDate, formatJstDateTime } from '@/lib/date/format';
import { getFatigueColor } from '@/lib/fatigue/colorMap';
import { CHART_PADDING, buildFatigueHistoryChartGeometry } from '@/lib/fatigue/chartGeometry';
import type { MuscleId } from '@/types/domain';

interface FatigueHistoryChartProps {
  history: { value: number; recordedAt: string }[];
  muscleId: MuscleId;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 132;

export default function FatigueHistoryChart({ history, muscleId }: FatigueHistoryChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400">
        記録がありません
      </div>
    );
  }

  const geometry = buildFatigueHistoryChartGeometry({
    history,
    now: new Date(),
    muscleId,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });

  if (geometry.historyPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400">
        記録がありません
      </div>
    );
  }

  const yAxisLabels = [100, 50, 0];

  return (
    <div className="space-y-2">
      <div className="rounded border border-gray-100 bg-white p-2">
        <svg
          role="img"
          aria-label="直近7日の疲労履歴チャート"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-36 w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1={CHART_PADDING.left}
            y1={CHART_PADDING.top}
            x2={CHART_PADDING.left}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#e5e7eb"
          />
          <line
            x1={CHART_PADDING.left}
            y1={CHART_HEIGHT - CHART_PADDING.bottom}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#e5e7eb"
          />
          {yAxisLabels.map((label) => {
            const y =
              CHART_PADDING.top +
              (1 - label / 100) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
            return (
              <g key={label}>
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y2={y}
                  stroke="#f3f4f6"
                />
                <text x="2" y={y + 3} className="fill-gray-400 text-[9px]">
                  {label}
                </text>
              </g>
            );
          })}

          {geometry.stepPath && (
            <path
              d={geometry.stepPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {geometry.prediction && (
            <line
              x1={geometry.prediction.start.x}
              y1={geometry.prediction.start.y}
              x2={geometry.prediction.end.x}
              y2={geometry.prediction.end.y}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {geometry.historyPoints.map((point, index) => (
            <circle
              key={`${point.recordedAt}-${index}`}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill={getFatigueColor(point.value)}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <title>{`${formatJstDateTime(point.recordedAt)} ${point.value}%`}</title>
            </circle>
          ))}

          {geometry.prediction && (
            <circle
              cx={geometry.prediction.start.x}
              cy={geometry.prediction.start.y}
              r="3"
              fill="#ffffff"
              stroke="#64748b"
              strokeWidth="1.5"
            >
              <title>{`現在 ${geometry.prediction.start.value}%`}</title>
            </circle>
          )}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatJstDate(geometry.domainStartAt).slice(5)}</span>
        <span>現在</span>
        <span>
          {geometry.recoveryEndAt
            ? `回復 ${formatJstDate(geometry.recoveryEndAt).slice(5)}`
            : ''}
        </span>
      </div>
    </div>
  );
}
