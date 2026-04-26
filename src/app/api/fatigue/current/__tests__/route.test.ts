import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/fatigue/getLatestSnapshot', () => ({
  getLatestSnapshot: vi.fn(),
}));

import { GET } from '../route';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';
import { MUSCLE_IDS } from '@/types/domain';
const mockGetLatestSnapshot = vi.mocked(getLatestSnapshot);

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/fatigue/current', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/fatigue/current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockGetLatestSnapshot.mockResolvedValue(null);
  });

  it('認証なし → 401', async () => {
    // Authorization ヘッダーなし → verifyIdToken を呼ぶ前に 401
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('全筋肉未記録 → 16 件すべて savedValue=0 で補完して返す', async () => {
    const res = await GET(makeRequest('valid_token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body.data)).toHaveLength(MUSCLE_IDS.length);
    for (const id of MUSCLE_IDS) {
      expect(body.data[id].savedValue).toBe(0);
      expect(body.data[id].currentValue).toBe(0);
      expect(body.data[id].recoveryHoursRemaining).toBe(0);
    }
  });

  it('記録済み筋肉 → 回復計算後の値を含む完全なマップを返す', async () => {
    const now = new Date();
    mockGetLatestSnapshot.mockImplementation(async (_uid, muscleId) => {
      if (muscleId === 'chest') {
        return {
          id: 'snap1',
          muscleId: 'chest' as const,
          value: 80,
          recordedAt: now,
          source: 'manual' as const,
          workoutSessionId: null,
        };
      }
      return null;
    });

    const res = await GET(makeRequest('valid_token'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // chest は記録済み（保存直後なので currentValue ≈ savedValue）
    expect(body.data.chest.savedValue).toBe(80);
    expect(body.data.chest.currentValue).toBeGreaterThan(0);
    // 未記録筋肉はデフォルト値
    expect(body.data.back.savedValue).toBe(0);
    // 16 筋肉すべて含む
    expect(Object.keys(body.data)).toHaveLength(MUSCLE_IDS.length);
  });
});
