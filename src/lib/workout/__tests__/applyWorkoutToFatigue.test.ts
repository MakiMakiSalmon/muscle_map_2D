import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { applyWorkoutToFatigue } from '@/lib/workout/applyWorkoutToFatigue';
import { applyDecay } from '@/lib/fatigue/decay';
import type { FatigueCurrentDocument } from '@/lib/fatigue/currentDoc';

vi.mock('@/lib/fatigue/currentDoc', () => ({
  readFatigueCurrent: vi.fn(),
}));

import { readFatigueCurrent } from '@/lib/fatigue/currentDoc';

const mockDb = {} as Parameters<typeof applyWorkoutToFatigue>[3];
const now = new Date('2026-04-24T12:00:00.000Z');
const sessionId = 'session-001';

function makeCurrent(overrides: Partial<FatigueCurrentDocument['muscles']['chest']>): FatigueCurrentDocument {
  return {
    muscles: {
      chest: {
        value: 80,
        recordedAt: now,
        createdAt: now,
        source: 'manual',
        workoutSessionId: null,
        ...overrides,
      },
    },
    updatedAt: now,
  };
}

describe('applyWorkoutToFatigue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('スナップショットなし → 0 + delta', async () => {
    (readFatigueCurrent as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]).toMatchObject({
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
    const current = makeCurrent({
      recordedAt: new Date(now.getTime() - 24 * 3600 * 1000),
    });
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.snapshots[0].value).toBe(80); // 40(decay) + 40(delta) = 80
  });

  it('100を超える場合は100でクランプ', async () => {
    const current = makeCurrent({
      recordedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    });
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 80 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.snapshots[0].value).toBe(100);
  });

  it('performedAt 時点でクランプし、現在値は performedAt から減衰する', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const current = makeCurrent({ value: 80, recordedAt: performedAt });
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result.snapshots[0]).toMatchObject({
      muscleId: 'chest',
      value: 100,
      recordedAt: performedAt,
      createdAt: now,
    });
    expect(applyDecay(result.snapshots[0].value, result.snapshots[0].recordedAt, 'chest', now)).toBe(50);
  });

  it('now + 5分の performedAt は減衰なしで記録する', async () => {
    (readFatigueCurrent as Mock).mockResolvedValue(null);
    const performedAt = new Date(now.getTime() + 5 * 60 * 1000);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result.snapshots[0]).toMatchObject({
      muscleId: 'chest',
      value: 40,
      recordedAt: performedAt,
      createdAt: now,
    });
  });

  it('過去 performedAt では既存値を performedAt まで前方減衰してから加算する', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const current = makeCurrent({
      value: 80,
      recordedAt: new Date(performedAt.getTime() - 12 * 3600 * 1000),
    });
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 20 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result.snapshots[0].value).toBe(80); // 80 * (1 - 12/48) + 20
    expect(result.snapshots[0].recordedAt).toBe(performedAt);
  });

  it('combined が 0 の場合はスナップショットを作らない', async () => {
    (readFatigueCurrent as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 0 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.snapshots).toEqual([]);
  });

  it('順序逆転ではその筋肉のスナップショットを作らない', async () => {
    const performedAt = new Date(now.getTime() - 24 * 3600 * 1000);
    const current = makeCurrent({
      recordedAt: new Date(performedAt.getTime() + 60_000),
    });
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      performedAt,
      now,
    );

    expect(result.snapshots).toEqual([]);
  });

  it('複数筋肉のインパクトを並列処理する', async () => {
    (readFatigueCurrent as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40, shoulders_left: 20, shoulders_right: 20 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.snapshots).toHaveLength(3);
    const muscleIds = result.snapshots.map((r) => r.muscleId);
    expect(muscleIds).toContain('chest');
    expect(muscleIds).toContain('shoulders_left');
    expect(muscleIds).toContain('shoulders_right');
    expect(readFatigueCurrent).toHaveBeenCalledOnce();
  });

  it('読み取った current を呼び出し元へ返す', async () => {
    const current = makeCurrent({});
    (readFatigueCurrent as Mock).mockResolvedValue(current);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
      now,
    );

    expect(result.current).toBe(current);
  });
});
