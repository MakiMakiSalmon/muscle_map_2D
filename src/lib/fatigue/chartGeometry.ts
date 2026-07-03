import { applyDecay } from '@/lib/fatigue/decay';
import { MUSCLE_RECOVERY_HOURS } from '@/types/domain';
import type { MuscleId } from '@/types/domain';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface ChartSnapshot {
  value: number;
  recordedAt: string;
}

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
  recordedAt: string;
}

export interface PredictionSegment {
  start: ChartPoint;
  end: ChartPoint;
  recoveryEndAt: string;
}

export interface FatigueHistoryChartGeometry {
  historyPoints: ChartPoint[];
  stepPath: string;
  prediction: PredictionSegment | null;
  domainStartAt: string;
  nowAt: string;
  recoveryEndAt: string | null;
}

interface BuildChartGeometryOptions {
  history: ChartSnapshot[];
  now: Date;
  muscleId: MuscleId;
  width: number;
  height: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  windowDays?: number;
}

export const CHART_PADDING = {
  top: 8,
  right: 8,
  bottom: 20,
  left: 28,
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function parseTime(iso: string): number {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    throw new Error(`Invalid recordedAt: ${iso}`);
  }
  return time;
}

function toPoint(
  snapshot: ChartSnapshot,
  timeMs: number,
  value: number,
  xForTime: (time: number) => number,
  yForValue: (value: number) => number,
): ChartPoint {
  const clampedValue = clampPercent(value);

  return {
    x: xForTime(timeMs),
    y: yForValue(clampedValue),
    value: clampedValue,
    recordedAt: snapshot.recordedAt,
  };
}

export function buildStepPath(points: ChartPoint[]): string {
  if (points.length < 2) return '';

  const format = (value: number) => Number(value.toFixed(3)).toString();
  const commands = [`M ${format(points[0].x)} ${format(points[0].y)}`];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    commands.push(`L ${format(current.x)} ${format(previous.y)}`);
    commands.push(`L ${format(current.x)} ${format(current.y)}`);
  }

  return commands.join(' ');
}

export function buildFatigueHistoryChartGeometry({
  history,
  now,
  muscleId,
  width,
  height,
  padding = CHART_PADDING,
  windowDays = 7,
}: BuildChartGeometryOptions): FatigueHistoryChartGeometry {
  const nowMs = now.getTime();
  const domainStartMs = nowMs - windowDays * DAY_MS;
  const recoveryHours = MUSCLE_RECOVERY_HOURS[muscleId];
  const recoveryMs = recoveryHours * HOUR_MS;

  const sorted = [...history]
    .map((snapshot, index) => ({
      snapshot,
      timeMs: parseTime(snapshot.recordedAt),
      index,
    }))
    .filter(({ timeMs }) => timeMs >= domainStartMs && timeMs <= nowMs)
    .sort((a, b) => a.timeMs - b.timeMs || a.index - b.index);

  const latest = sorted.at(-1) ?? null;
  const latestRecoveryEndMs =
    latest && latest.snapshot.value > 0 ? latest.timeMs + recoveryMs : null;
  const domainEndMs = Math.max(nowMs, latestRecoveryEndMs ?? nowMs);
  const domainDurationMs = Math.max(1, domainEndMs - domainStartMs);
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);

  const xForTime = (timeMs: number) =>
    padding.left + ((timeMs - domainStartMs) / domainDurationMs) * plotWidth;
  const yForValue = (value: number) =>
    padding.top + (1 - clampPercent(value) / 100) * plotHeight;

  const historyPoints = sorted.map(({ snapshot, timeMs }) =>
    toPoint(snapshot, timeMs, snapshot.value, xForTime, yForValue),
  );

  let prediction: PredictionSegment | null = null;
  if (latest) {
    const currentValue = applyDecay(
      latest.snapshot.value,
      new Date(latest.snapshot.recordedAt),
      muscleId,
      now,
    );
    const recoveryEndMs = Math.max(nowMs, latestRecoveryEndMs ?? nowMs);
    const startSnapshot = {
      value: currentValue,
      recordedAt: now.toISOString(),
    };
    const endSnapshot = {
      value: 0,
      recordedAt: new Date(recoveryEndMs).toISOString(),
    };

    if (currentValue > 0) {
      prediction = {
        start: toPoint(startSnapshot, nowMs, currentValue, xForTime, yForValue),
        end: toPoint(endSnapshot, recoveryEndMs, 0, xForTime, yForValue),
        recoveryEndAt: endSnapshot.recordedAt,
      };
    }
  }

  return {
    historyPoints,
    stepPath: buildStepPath(historyPoints),
    prediction,
    domainStartAt: new Date(domainStartMs).toISOString(),
    nowAt: now.toISOString(),
    recoveryEndAt: prediction?.recoveryEndAt ?? null,
  };
}
