import { describe, it, expect, vi, type Mock } from 'vitest';
import { applyWorkoutToFatigue } from '@/lib/workout/applyWorkoutToFatigue';
import type { FatigueSnapshot } from '@/types/domain';

vi.mock('@/lib/fatigue/getLatestSnapshot', () => ({
  getLatestSnapshot: vi.fn(),
}));

import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';

const mockDb = {} as Parameters<typeof applyWorkoutToFatigue>[3];
const now = new Date('2026-04-24T12:00:00.000Z');
const sessionId = 'session-001';

describe('applyWorkoutToFatigue', () => {
  it('スナップショットなし → 0 + delta', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      muscleId: 'chest',
      value: 40,
      source: 'workout',
      workoutSessionId: sessionId,
      recordedAt: now,
    });
  });

  it('スナップショットあり → decay後の現在値 + delta', async () => {
    // chest(48h): 24h前に 80 → decay後 40
    const snapshot: FatigueSnapshot = {
      id: 'snap-1',
      muscleId: 'chest',
      value: 80,
      recordedAt: new Date(now.getTime() - 24 * 3600 * 1000),
      source: 'manual',
      workoutSessionId: null,
    };
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40 },
      sessionId,
      mockDb,
      now,
    );

    expect(result[0].value).toBe(80); // 40(decay) + 40(delta) = 80
  });

  it('100を超える場合は100でクランプ', async () => {
    const snapshot: FatigueSnapshot = {
      id: 'snap-1',
      muscleId: 'chest',
      value: 80,
      recordedAt: new Date(now.getTime() - 1 * 3600 * 1000),
      source: 'manual',
      workoutSessionId: null,
    };
    (getLatestSnapshot as Mock).mockResolvedValue(snapshot);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 80 },
      sessionId,
      mockDb,
      now,
    );

    expect(result[0].value).toBe(100);
  });

  it('複数筋肉のインパクトを並列処理する', async () => {
    (getLatestSnapshot as Mock).mockResolvedValue(null);

    const result = await applyWorkoutToFatigue(
      'uid-1',
      { chest: 40, shoulders_left: 20, shoulders_right: 20 },
      sessionId,
      mockDb,
      now,
    );

    expect(result).toHaveLength(3);
    const muscleIds = result.map((r) => r.muscleId);
    expect(muscleIds).toContain('chest');
    expect(muscleIds).toContain('shoulders_left');
    expect(muscleIds).toContain('shoulders_right');
  });
});
