import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { MuscleId } from '@/types/domain';

const { mockGet, mockDocGet, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDocGet: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => {
  const docChain = { get: mockDocGet };
  const queryChain = {
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    get: mockGet,
  };
  return {
    adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
    adminDb: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        ...queryChain,
        doc: vi.fn().mockReturnValue(docChain),
      }),
    }),
  };
});

import { GET } from '../route';

function makeSession(
  id: string,
  performedAt: Date,
  fatigueImpacts?: Partial<Record<MuscleId, number>>,
) {
  return {
    id,
    data: () => ({
      performedAt: { toDate: () => performedAt },
      exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: 60 }],
      ...(fatigueImpacts !== undefined ? { fatigueImpacts } : {}),
    }),
  };
}

function makeRequest(params?: Record<string, string>, token = 'valid_token') {
  const url = new URL('http://localhost/api/workout/history');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('GET /api/workout/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockGet.mockResolvedValue({ docs: [] });
  });

  it('認証なし → 401', async () => {
    const res = await GET(makeRequest({}, ''));
    expect(res.status).toBe(401);
  });

  it('正常取得（セッションなし）→ 200 と空配列', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it('正常取得（セッションあり）→ sessions と nextCursor: null を返す', async () => {
    const now = new Date('2026-04-01T10:00:00Z');
    mockGet.mockResolvedValueOnce({ docs: [makeSession('session1', now)] });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].id).toBe('session1');
    expect(body.sessions[0].performedAt).toBe(now.toISOString());
    expect(body.sessions[0].exercises).toHaveLength(1);
    expect(body.sessions[0]).not.toHaveProperty('fatigueImpacts');
    expect(body.nextCursor).toBeNull();
  });

  it('fatigueImpacts が保存済みのセッションではレスポンスに含める', async () => {
    const now = new Date('2026-04-01T10:00:00Z');
    mockGet.mockResolvedValueOnce({
      docs: [makeSession('session1', now, { chest: 12, triceps_left: 8 })],
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions[0].fatigueImpacts).toEqual({ chest: 12, triceps_left: 8 });
  });

  it('limit+1 件取得されたとき → nextCursor が返る', async () => {
    // limit=2 で 3 件返ってきた場合、hasMore=true → nextCursor = docs[1].id
    const docs = [
      makeSession('s1', new Date('2026-04-03T00:00:00Z')),
      makeSession('s2', new Date('2026-04-02T00:00:00Z')),
      makeSession('s3', new Date('2026-04-01T00:00:00Z')),
    ];
    mockGet.mockResolvedValueOnce({ docs });

    const res = await GET(makeRequest({ limit: '2' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(2);
    expect(body.nextCursor).toBe('s2');
  });

  it('無効な cursor → 400', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });

    const res = await GET(makeRequest({ cursor: 'nonexistent_id' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CURSOR');
  });

  it('有効な cursor → startAfter を使ってページネーション', async () => {
    const cursorDoc = { exists: true, id: 'session_cursor' };
    mockDocGet.mockResolvedValueOnce(cursorDoc);
    mockGet.mockResolvedValueOnce({ docs: [] });

    const res = await GET(makeRequest({ cursor: 'session_cursor' }));
    expect(res.status).toBe(200);
  });
});
