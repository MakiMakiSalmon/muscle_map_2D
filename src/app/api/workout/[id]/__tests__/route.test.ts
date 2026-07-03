import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import type { MuscleId } from '@/types/domain';

const {
  mockBatchDelete,
  mockBatchSet,
  mockBatchCommit,
  mockCollection,
  mockVerifyIdToken,
} = vi.hoisted(() => ({
  mockBatchDelete: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchCommit: vi.fn().mockResolvedValue(undefined),
  mockCollection: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({
    collection: mockCollection,
    batch: vi.fn(() => ({
      delete: mockBatchDelete,
      set: mockBatchSet,
      commit: mockBatchCommit,
    })),
  }),
}));

import { DELETE } from '../route';

type SnapshotFixture = {
  id: string;
  muscleId: MuscleId;
  value: number;
  recordedAt: Date;
  createdAt: Date;
  source?: 'manual' | 'workout';
  workoutSessionId?: string | null;
};

const targetChest: SnapshotFixture = {
  id: 'snap_target_chest',
  muscleId: 'chest',
  value: 60,
  recordedAt: new Date('2026-07-03T09:00:00.000Z'),
  createdAt: new Date('2026-07-03T09:00:01.000Z'),
  source: 'workout',
  workoutSessionId: 'session1',
};

const previousChest: SnapshotFixture = {
  id: 'snap_prev_chest',
  muscleId: 'chest',
  value: 25,
  recordedAt: new Date('2026-07-02T09:00:00.000Z'),
  createdAt: new Date('2026-07-02T09:00:01.000Z'),
  source: 'manual',
  workoutSessionId: null,
};

let sessionExists = true;
let targetSnapshots: SnapshotFixture[] = [targetChest];
let latestByMuscle: Partial<Record<MuscleId, SnapshotFixture[]>> = {
  chest: [targetChest, previousChest],
};

function makeDoc(snapshot: SnapshotFixture) {
  return {
    id: snapshot.id,
    ref: { id: snapshot.id, path: `snapshot/${snapshot.id}` },
    data: () => ({
      muscleId: snapshot.muscleId,
      value: snapshot.value,
      recordedAt: Timestamp.fromDate(snapshot.recordedAt),
      createdAt: Timestamp.fromDate(snapshot.createdAt),
      source: snapshot.source ?? 'workout',
      workoutSessionId: snapshot.workoutSessionId ?? null,
    }),
  };
}

function makeSnapshotQuery(docs: SnapshotFixture[]) {
  return {
    docs: docs.map(makeDoc),
  };
}

function setupCollectionMock() {
  mockCollection.mockImplementation((path: string) => {
    if (path.endsWith('/workoutSessions')) {
      return {
        doc: vi.fn((id: string) => ({
          id,
          path: `${path}/${id}`,
          get: vi.fn().mockResolvedValue({ exists: sessionExists }),
        })),
      };
    }

    if (path.endsWith('/state')) {
      return {
        doc: vi.fn((id: string) => ({ id, path: `${path}/${id}` })),
      };
    }

    if (path.endsWith('/fatigueSnapshots')) {
      return {
        where: vi.fn((field: string, _op: string, value: string) => {
          if (field === 'workoutSessionId') {
            return {
              get: vi.fn().mockResolvedValue(makeSnapshotQuery(targetSnapshots)),
            };
          }

          if (field === 'muscleId') {
            const query = {
              orderBy: vi.fn(() => query),
              limit: vi.fn(() => query),
              get: vi.fn().mockResolvedValue(makeSnapshotQuery(latestByMuscle[value as MuscleId] ?? [])),
            };
            return query;
          }

          throw new Error(`Unexpected where field: ${field}`);
        }),
      };
    }

    return {};
  });
}

function makeRequest(id = 'session1', token = 'valid_token') {
  return new NextRequest(`http://localhost/api/workout/${id}`, {
    method: 'DELETE',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('DELETE /api/workout/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockBatchCommit.mockResolvedValue(undefined);
    sessionExists = true;
    targetSnapshots = [targetChest];
    latestByMuscle = { chest: [targetChest, previousChest] };
    setupCollectionMock();
  });

  it('セッションが存在しない場合は 404', async () => {
    sessionExists = false;

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('WORKOUT_SESSION_NOT_FOUND');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('影響筋肉により新しいスナップショットがあれば 409', async () => {
    const newerChest: SnapshotFixture = {
      ...targetChest,
      id: 'snap_newer_chest',
      createdAt: new Date('2026-07-03T09:00:02.000Z'),
      workoutSessionId: 'session2',
    };
    latestByMuscle = { chest: [newerChest, targetChest] };

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('HAS_NEWER_SNAPSHOT');
    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('削除対象スナップショットを workoutSessionId で特定して削除する', async () => {
    const targetShoulder: SnapshotFixture = {
      id: 'snap_target_shoulder',
      muscleId: 'shoulders_left',
      value: 40,
      recordedAt: targetChest.recordedAt,
      createdAt: targetChest.createdAt,
      source: 'workout',
      workoutSessionId: 'session1',
    };
    targetSnapshots = [targetChest, targetShoulder];
    latestByMuscle = {
      chest: [targetChest, previousChest],
      shoulders_left: [targetShoulder],
    };

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      deletedSessionId: 'session1',
      affectedMuscles: ['chest', 'shoulders_left'],
    });
    expect(mockBatchDelete).toHaveBeenCalledTimes(3);
    expect(mockBatchDelete.mock.calls.map(([ref]) => ref.id)).toEqual([
      'session1',
      'snap_target_chest',
      'snap_target_shoulder',
    ]);
  });

  it('current を直前スナップショットの値へ復元する', async () => {
    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    expect(mockBatchSet).toHaveBeenCalledOnce();
    const [ref, data, options] = mockBatchSet.mock.calls[0];
    expect(ref.id).toBe('fatigueCurrent');
    expect(data.muscles.chest.value).toBe(25);
    expect(data.muscles.chest.recordedAt.toDate()).toEqual(previousChest.recordedAt);
    expect(data.muscles.chest.createdAt.toDate()).toEqual(previousChest.createdAt);
    expect(data.muscles.chest.source).toBe('manual');
    expect(data.muscles.chest.workoutSessionId).toBeNull();
    expect(options).toEqual({ merge: true });
  });

  it('直前スナップショットがない筋肉は current をデフォルト値 0 へ戻す', async () => {
    latestByMuscle = { chest: [targetChest] };

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    const [, data] = mockBatchSet.mock.calls[0];
    expect(data.muscles.chest.value).toBe(0);
    expect(data.muscles.chest.recordedAt.toDate()).toEqual(new Date(0));
    expect(data.muscles.chest.createdAt.toDate()).toEqual(new Date(0));
    expect(data.muscles.chest.source).toBe('manual');
    expect(data.muscles.chest.workoutSessionId).toBeNull();
  });

  it('セッション削除・スナップショット削除・current 復元を単一 batch で commit する', async () => {
    await DELETE(makeRequest());

    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });
});
