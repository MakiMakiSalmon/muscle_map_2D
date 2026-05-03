import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockBatchSet, mockBatchCommit, mockCollection, mockVerifyIdToken } = vi.hoisted(() => ({
  mockBatchSet: vi.fn(),
  mockBatchCommit: vi.fn().mockResolvedValue(undefined),
  mockCollection: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({
    collection: mockCollection,
    batch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
  }),
}));

vi.mock('@/lib/workout/applyWorkoutToFatigue', () => ({
  applyWorkoutToFatigue: vi.fn(),
}));

import { POST } from '../route';
import { applyWorkoutToFatigue } from '@/lib/workout/applyWorkoutToFatigue';
const mockApplyWorkout = vi.mocked(applyWorkoutToFatigue);

const BENCH_PRESS_DOC = {
  exists: true,
  id: 'bench_press',
  data: () => ({
    nameJa: 'ベンチプレス',
    nameEn: 'bench_press',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
  }),
};

function setupCollectionMock() {
  mockCollection.mockImplementation((path: string) => {
    if (path === 'exercises') {
      return {
        doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(BENCH_PRESS_DOC) }),
      };
    }
    return { doc: vi.fn().mockReturnValue({ id: 'auto_id' }) };
  });
}

function makeRequest(body: unknown, token = 'valid_token') {
  return new NextRequest('http://localhost/api/workout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  performedAt: new Date(Date.now() - 60_000).toISOString(), // 1分前
  exercises: [
    { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: 60 },
  ],
};

describe('POST /api/workout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockBatchCommit.mockResolvedValue(undefined);
    setupCollectionMock();
    mockApplyWorkout.mockResolvedValue([
      {
        muscleId: 'chest' as const,
        value: 60,
        recordedAt: new Date(),
        source: 'workout' as const,
        workoutSessionId: 'auto_id',
      },
    ]);
  });

  it('認証なし → 401', async () => {
    // token が空文字 → Authorization ヘッダーなし → verifyIdToken を呼ぶ前に 401
    const res = await POST(makeRequest(VALID_BODY, ''));
    expect(res.status).toBe(401);
  });

  it('不正 JSON → 400', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    const req = new NextRequest('http://localhost/api/workout', {
      method: 'POST',
      headers: { authorization: 'Bearer valid_token', 'content-type': 'application/json' },
      body: 'invalid json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('exercises が空配列 → 400', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, exercises: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('sets が範囲外（0）→ 400', async () => {
    const res = await POST(makeRequest({
      ...VALID_BODY,
      exercises: [{ exerciseId: 'bench_press', sets: 0, reps: 10, weightKg: 60 }],
    }));
    expect(res.status).toBe(400);
  });

  it('未来の performedAt → 400', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分後
    const res = await POST(makeRequest({ ...VALID_BODY, performedAt: futureDate }));
    expect(res.status).toBe(400);
  });

  it('存在しない exerciseId → 400', async () => {
    mockCollection.mockImplementation(() => ({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    }));
    const res = await POST(makeRequest({
      ...VALID_BODY,
      exercises: [{ exerciseId: 'not_exist', sets: 3, reps: 10, weightKg: 60 }],
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('EXERCISE_NOT_FOUND');
  });

  it('正常保存 → 201 とセッション・疲労デルタを返す', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.exercises).toHaveLength(1);
    expect(body.fatigueImpacts).toBeDefined();
    // batch.set が（セッション1件 + スナップショット1件）呼ばれる
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });
});
