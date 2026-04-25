import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGet, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => {
  const queryChain = {
    where: vi.fn().mockReturnThis(),
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

const BENCH_PRESS_DOC = {
  id: 'bench_press',
  data: () => ({
    nameJa: 'ベンチプレス',
    nameEn: 'bench_press',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
  }),
};

function makeRequest(params?: Record<string, string>, token = 'valid_token') {
  const url = new URL('http://localhost/api/exercises');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/exercises', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockGet.mockResolvedValue({ docs: [] });
  });

  it('認証なし → 401', async () => {
    const res = await GET(makeRequest(undefined, ''));
    expect(res.status).toBe(401);
  });

  it('q なし → 全件取得（200 と exercises 配列）', async () => {
    mockGet.mockResolvedValueOnce({ docs: [BENCH_PRESS_DOC] });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0].id).toBe('bench_press');
    expect(body.exercises[0].nameJa).toBe('ベンチプレス');
    expect(body.exercises[0].primaryMuscles).toEqual(['chest', 'triceps']);
  });

  it('q あり → 前方一致検索で結果を返す', async () => {
    mockGet.mockResolvedValueOnce({ docs: [BENCH_PRESS_DOC] });
    const res = await GET(makeRequest({ q: 'ベンチ' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0].nameJa).toBe('ベンチプレス');
  });

  it('q あり・ヒットなし → exercises が空配列', async () => {
    mockGet.mockResolvedValueOnce({ docs: [] });
    const res = await GET(makeRequest({ q: 'zzz' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exercises).toHaveLength(0);
  });
});
