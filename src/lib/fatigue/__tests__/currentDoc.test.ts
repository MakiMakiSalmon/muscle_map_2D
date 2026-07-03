import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  buildCurrentMerge,
  fatigueCurrentDocRef,
  readFatigueCurrent,
  type FatigueCurrentDocument,
} from '@/lib/fatigue/currentDoc';
import type { FatigueSnapshotInput } from '@/types/domain';

function snapshot(overrides: Partial<FatigueSnapshotInput>): FatigueSnapshotInput {
  return {
    muscleId: 'chest',
    value: 50,
    recordedAt: new Date('2026-04-24T12:00:00.000Z'),
    createdAt: new Date('2026-04-24T12:00:01.000Z'),
    source: 'manual',
    workoutSessionId: null,
    ...overrides,
  };
}

function current(recordedAt: Date, createdAt: Date, value = 40): FatigueCurrentDocument {
  return {
    muscles: {
      chest: {
        value,
        recordedAt,
        createdAt,
        source: 'manual',
        workoutSessionId: null,
      },
    },
    updatedAt: createdAt,
  };
}

describe('currentDoc', () => {
  it('fatigueCurrent の固定 doc 参照を返す', () => {
    const doc = vi.fn();
    const collection = vi.fn(() => ({ doc }));
    const db = { collection };

    fatigueCurrentDocRef('uid-1', db as never);

    expect(collection).toHaveBeenCalledWith('users/uid-1/state');
    expect(doc).toHaveBeenCalledWith('fatigueCurrent');
  });

  it('readFatigueCurrent は doc 欠落時に null を返す', async () => {
    const get = vi.fn().mockResolvedValue({ exists: false });
    const db = { collection: vi.fn(() => ({ doc: vi.fn(() => ({ get })) })) };

    await expect(readFatigueCurrent('uid-1', db as never)).resolves.toBeNull();
    expect(get).toHaveBeenCalledOnce();
  });

  it('readFatigueCurrent は Timestamp を Date に変換する', async () => {
    const recordedAt = new Date('2026-04-24T12:00:00.000Z');
    const createdAt = new Date('2026-04-24T12:00:01.000Z');
    const get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        muscles: {
          chest: {
            value: 80,
            recordedAt: Timestamp.fromDate(recordedAt),
            createdAt: Timestamp.fromDate(createdAt),
            source: 'workout',
            workoutSessionId: 'session-1',
          },
        },
        updatedAt: Timestamp.fromDate(createdAt),
      }),
    });
    const db = { collection: vi.fn(() => ({ doc: vi.fn(() => ({ get })) })) };

    const result = await readFatigueCurrent('uid-1', db as never);

    expect(result?.muscles.chest).toEqual({
      value: 80,
      recordedAt,
      createdAt,
      source: 'workout',
      workoutSessionId: 'session-1',
    });
    expect(result?.updatedAt).toEqual(createdAt);
  });

  it('buildCurrentMerge は recordedAt が最大の snapshot だけを採用する', () => {
    const older = snapshot({
      value: 60,
      recordedAt: new Date('2026-04-24T12:00:00.000Z'),
      createdAt: new Date('2026-04-24T12:00:10.000Z'),
    });
    const newer = snapshot({
      value: 70,
      recordedAt: new Date('2026-04-24T13:00:00.000Z'),
      createdAt: new Date('2026-04-24T13:00:01.000Z'),
    });

    const merge = buildCurrentMerge(null, [older, newer]);

    expect(merge?.muscles.chest?.value).toBe(70);
    expect(merge?.muscles.chest?.recordedAt.toDate()).toEqual(newer.recordedAt);
    expect(merge?.muscles.chest?.createdAt.toDate()).toEqual(newer.createdAt);
  });

  it('buildCurrentMerge は同一 recordedAt では createdAt が最大の snapshot を採用する', () => {
    const recordedAt = new Date('2026-04-24T12:00:00.000Z');
    const older = snapshot({
      value: 60,
      recordedAt,
      createdAt: new Date('2026-04-24T12:00:01.000Z'),
    });
    const newer = snapshot({
      value: 90,
      recordedAt,
      createdAt: new Date('2026-04-24T12:00:02.000Z'),
    });

    const merge = buildCurrentMerge(null, [older, newer]);

    expect(merge?.muscles.chest?.value).toBe(90);
    expect(merge?.muscles.chest?.createdAt.toDate()).toEqual(newer.createdAt);
  });

  it('buildCurrentMerge は既存 current より古い snapshot で上書きしない', () => {
    const existing = current(
      new Date('2026-04-24T13:00:00.000Z'),
      new Date('2026-04-24T13:00:01.000Z'),
      80,
    );
    const older = snapshot({
      value: 40,
      recordedAt: new Date('2026-04-24T12:00:00.000Z'),
      createdAt: new Date('2026-04-24T12:00:01.000Z'),
    });

    expect(buildCurrentMerge(existing, [older])).toBeNull();
  });

  it('buildCurrentMerge は既存 current と同一 recordedAt なら createdAt で後勝ちにする', () => {
    const recordedAt = new Date('2026-04-24T12:00:00.000Z');
    const existing = current(recordedAt, new Date('2026-04-24T12:00:01.000Z'), 60);
    const newer = snapshot({
      value: 75,
      recordedAt,
      createdAt: new Date('2026-04-24T12:00:02.000Z'),
    });

    const merge = buildCurrentMerge(existing, [newer]);

    expect(merge?.muscles.chest?.value).toBe(75);
  });
});
