import { describe, expect, it } from 'vitest';
import {
  buildFatigueHistoryChartGeometry,
  buildStepPath,
  type ChartPoint,
} from '@/lib/fatigue/chartGeometry';

const noPadding = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

describe('buildFatigueHistoryChartGeometry', () => {
  it('実時間をX座標、疲労値をY座標へ変換する', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [
        { value: 100, recordedAt: '2026-01-01T00:00:00.000Z' },
        { value: 50, recordedAt: '2026-01-04T12:00:00.000Z' },
        { value: 0, recordedAt: '2026-01-06T00:00:00.000Z' },
      ],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.historyPoints[0].x).toBe(0);
    expect(geometry.historyPoints[0].y).toBe(0);
    expect(geometry.historyPoints[1].x).toBe(50);
    expect(geometry.historyPoints[1].y).toBe(50);
  });

  it('予測破線の終点を完全回復時刻と値0にする', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [{ value: 80, recordedAt: '2026-01-07T00:00:00.000Z' }],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.prediction?.start.value).toBe(40);
    expect(geometry.prediction?.end.value).toBe(0);
    expect(geometry.prediction?.end.x).toBe(100);
    expect(geometry.prediction?.end.y).toBe(100);
    expect(geometry.prediction?.recoveryEndAt).toBe('2026-01-09T00:00:00.000Z');
  });

  it('0件は空の座標として扱う', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.historyPoints).toEqual([]);
    expect(geometry.stepPath).toBe('');
    expect(geometry.prediction).toBeNull();
  });

  it('1件は点と予測破線のみを返す', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [{ value: 60, recordedAt: '2026-01-07T00:00:00.000Z' }],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.historyPoints).toHaveLength(1);
    expect(geometry.stepPath).toBe('');
    expect(geometry.prediction).not.toBeNull();
  });

  it('同時刻の複数記録は同じX座標の縦段差にする', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [
        { value: 60, recordedAt: '2026-01-07T00:00:00.000Z' },
        { value: 20, recordedAt: '2026-01-07T00:00:00.000Z' },
      ],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.historyPoints[0].x).toBe(geometry.historyPoints[1].x);
    expect(geometry.stepPath).toBe('M 75 40 L 75 40 L 75 80');
  });

  it('リセット値0をステップ折れ線の段差として表現する', () => {
    const geometry = buildFatigueHistoryChartGeometry({
      history: [
        { value: 80, recordedAt: '2026-01-06T00:00:00.000Z' },
        { value: 0, recordedAt: '2026-01-07T00:00:00.000Z' },
      ],
      now: new Date('2026-01-08T00:00:00.000Z'),
      muscleId: 'chest',
      width: 100,
      height: 100,
      padding: noPadding,
    });

    expect(geometry.stepPath).toBe('M 71.429 20 L 85.714 20 L 85.714 100');
    expect(geometry.prediction).toBeNull();
  });
});

describe('buildStepPath', () => {
  it('2点未満なら空文字を返す', () => {
    const point: ChartPoint = {
      x: 10,
      y: 20,
      value: 80,
      recordedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(buildStepPath([])).toBe('');
    expect(buildStepPath([point])).toBe('');
  });
});
