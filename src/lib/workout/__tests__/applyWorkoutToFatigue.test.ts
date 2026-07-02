import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { applyWorkoutToFatigue } from '@/lib/workout/applyWorkoutToFatigue';
import { applyDecay } from '@/lib/fatigue/decay';
import type { FatigueSnapshot } from '@/types/domain';

vi.mock('@/lib/fatigue/getLatestSnapshot', () => ({
  getLatestSnapshot: vi.fn(),
}));

import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';

const mockDb = {} as Parameters<typeof applyWorkoutToFatigue>[3];
const now = new Date('2026-04-24T12:00:00.000Z');
const sessionId = 'session-001';

function makeSnapshot(overrides: Partial<FatigueSnapshot>): FatigueSnapshot {
  return {
    id: 'snap-1',
    muscleId: 'chest',
    value: 80,
    recordedAt: now,
    createdAt: now,
    source: 'manual',
    workoutSessionId: null,
    ...overrides,
  };
}

describe('applyWorkoutToFatigue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('スナップショットなし → 0 + delta', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      muscleId: 'chest',
      value: 40,
      source: 'workout',
      workoutSessionId: sessionId,
      recordedAt: now,
      createdAt: now,
    });
  });

  it('スナップショットあり → decay後の現在値 + delta', async () => {
    // chest(48h): 24h前に 80 → decay後 40
    const snapshot = makeSnapshot({
      recordedAt: new Date(now.getTime() - 24 * 3600 * 1000),
    });
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result[0].value).toBe(80); // 40(decay) + 40(delta) = 80
  });

  it('100を超える場合は100でクランプ', async () => {
    const snapshot = makeSnapshot({
      recordedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    });
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 80 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result[0].value).toBe(100);
  });

  it('performedAt 時点でクランプし、現在値は performedAt から減衰する', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const snapshot = makeSnapshot({ value: 80, recordedAt: performedAt });
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result[0]).toMatchObject({
      muscleId: 'chest',
      value: 100,
      recordedAt: performedAt,
      createdAt: now,
    });
    expect(applyDecay(result[0].value, result[0].recordedAt, 'chest', now)).toBe(50);
  });

  it('now + 5分の performedAt は減衰なしで記録する', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);
    const performedAt = new Date(now.getTime() + 5 * 60 * 1000);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result[0]).toMatchObject({
      muscleId: 'chest',
      value: 40,
      recordedAt: performedAt,
      createdAt: now,
    });
  });

  it('過去 performedAt では既存値を performedAt まで前方減衰してから加算する', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const snapshot = makeSnapshot({
      value: 80,
      recordedAt: new Date(performedAt.getTime() - 12 * 3600 * 1000),
    });
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 20 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result[0].value).toBe(80); // 80 * (1 - 12/48) + 20
    expect(result[0].recordedAt).toBe(performedAt);
  });

  it('combined が 0 の場合はスナップショットを作らない', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 0 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result).toEqual([]);
  });

  it('順序逆転ではその筋肉のスナップショットを作らない', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const snapshot = makeSnapshot({
      recordedAt: new Date(performedAt.getTime() + 60_000),
    });
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result).toEqual([]);
  });

  it('複数筋肉のインパクトを並列処理する', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40, shoulders_left: 20, shoulders_right: 20 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result).toHaveLength(3);
    const muscleIds = result.map((r) => r.muscleId);
    expect(muscleIds).toContain('chest');
    expect(muscleIds).toContain('shoulders_left');
    expect(muscleIds).toContain('shoulders_right');
  });
});
