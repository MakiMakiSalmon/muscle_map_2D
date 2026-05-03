import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGet, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => {
  const queryChain = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: mockGet,
  };
  return {
    adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
    adminDb: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue(queryChain),
    }),
  };
});

import { GET } from '../route';

function makeRequest(params?: Record<string, string>, token = 'valid_token') {
  const url = new URL('http://localhost/api/fatigue/history');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/fatigue/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockGet.mockResolvedValue({ docs: [] });
  });

  it('認証なし → 401', async () => {
    const res = await GET(makeRequest({ muscleId: 'chest' }, ''));
    expect(res.status).toBe(401);
  });

  it('muscleId なし → 400', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_PARAMS');
  });

  it('不正な muscleId → 400', async () => {
    const res = await GET(makeRequest({ muscleId: 'invalid_muscle' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_PARAMS');
  });

  it('正常取得 → 200 と history 配列を返す', async () => {
    const now = new Date('2026-01-01T00:00:00Z');
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'snap1',
          data: () => ({
            muscleId: 'chest',
            value: 80,
            recordedAt: { toDate: () => now },
            source: 'manual',
            workoutSessionId: null,
          }),
        },
      ],
    });

    const res = await GET(makeRequest({ muscleId: 'chest' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.history).toHaveLength(1);
    expect(body.history[0].muscleId).toBe('chest');
    expect(body.history[0].value).toBe(80);
    expect(body.history[0].source).toBe('manual');
    expect(body.history[0].workoutSessionId).toBeNull();
  });
});
