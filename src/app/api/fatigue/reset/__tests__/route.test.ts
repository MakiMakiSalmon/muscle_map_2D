import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

const { mockBatchSet, mockBatchCommit, mockVerifyIdToken } = vi.hoisted(() => ({
  mockBatchSet: vi.fn(),
  mockBatchCommit: vi.fn().mockResolvedValue(undefined),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn((id?: string) => ({ id: id ?? 'auto_id' })),
    }),
    batch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
  }),
}));

import { PUT } from '../route';
import { MUSCLE_IDS } from '@/types/domain';

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/fatigue/reset', {
    method: 'PUT',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('PUT /api/fatigue/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('認証なし → 401', async () => {
    // Authorization ヘッダーなし → verifyIdToken を呼ぶ前に 401
    const res = await PUT(makeRequest());
    expect(res.status).toBe(401);
  });

  it('16 筋肉分の snapshot と current を同一 batch で書き込む', async () => {
    const res = await PUT(makeRequest('valid_token'));
    expect(res.status).toBe(200);

    expect(mockBatchSet).toHaveBeenCalledTimes(MUSCLE_IDS.length + 1);

    const snapshotWrites = mockBatchSet.mock.calls.slice(0, MUSCLE_IDS.length);
    const writtenMuscleIds = snapshotWrites.map(([, data]) => data.muscleId);
    expect(writtenMuscleIds.sort()).toEqual([...MUSCLE_IDS].sort());

    for (const [, data] of snapshotWrites) {
      expect(data.value).toBe(0);
      expect(data.source).toBe('manual');
      expect(data.workoutSessionId).toBeNull();
      expect(data.createdAt).toBeInstanceOf(Timestamp);
      expect(data.createdAt.toDate()).toEqual(data.recordedAt.toDate());
    }

    const currentWrite = mockBatchSet.mock.calls[MUSCLE_IDS.length];
    expect(currentWrite[0].id).toBe('fatigueCurrent');
    expect(Object.keys(currentWrite[1].muscles).sort()).toEqual([...MUSCLE_IDS].sort());
    expect(currentWrite[1].muscles.chest.value).toBe(0);
    expect(currentWrite[2]).toEqual({ merge: true });
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });

  it('resetAt を ISO 8601 文字列で返す', async () => {
    const res = await PUT(makeRequest('valid_token'));
    const body = await res.json();
    expect(body.resetAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
