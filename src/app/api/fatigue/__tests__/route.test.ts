import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

const { mockDocSet, mockVerifyIdToken } = vi.hoisted(() => ({
  mockDocSet: vi.fn().mockResolvedValue(undefined),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ id: 'snap_auto_id', set: mockDocSet }),
    }),
  }),
}));

import { POST } from '../route';

function makeRequest(body?: unknown, token?: string) {
  return new NextRequest('http://localhost/api/fatigue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/fatigue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'test_uid' } as never);
    mockDocSet.mockResolvedValue(undefined);
  });

  it('認証なし → 401', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 75 }));
    expect(res.status).toBe(401);
  });

  it('正常系 → 201 + snapshot を返す', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 75 }, 'valid_token'));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.snapshot.id).toBe('snap_auto_id');
    expect(body.snapshot.muscleId).toBe('chest');
    expect(body.snapshot.value).toBe(75);
    expect(body.snapshot.source).toBe('manual');
    expect(body.snapshot.workoutSessionId).toBeNull();
    expect(body.snapshot.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('Firestore に source=manual, workoutSessionId=null, Timestamp で書き込む', async () => {
    await POST(makeRequest({ muscleId: 'back', value: 50 }, 'valid_token'));
    expect(mockDocSet).toHaveBeenCalledOnce();
    const [data] = mockDocSet.mock.calls[0];
    expect(data.muscleId).toBe('back');
    expect(data.value).toBe(50);
    expect(data.source).toBe('manual');
    expect(data.workoutSessionId).toBeNull();
    expect(data.recordedAt).toBeInstanceOf(Timestamp);
  });

  it('value = 0（最小値境界）→ 201', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 0 }, 'valid_token'));
    expect(res.status).toBe(201);
  });

  it('value = 100（最大値境界）→ 201', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 100 }, 'valid_token'));
    expect(res.status).toBe(201);
  });

  it('muscleId が不正 → 400', async () => {
    const res = await POST(makeRequest({ muscleId: 'invalid_muscle', value: 50 }, 'valid_token'));
    expect(res.status).toBe(400);
  });

  it('value が 100 超 → 400', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 101 }, 'valid_token'));
    expect(res.status).toBe(400);
  });

  it('value が負数 → 400', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: -1 }, 'valid_token'));
    expect(res.status).toBe(400);
  });

  it('value が小数 → 400', async () => {
    const res = await POST(makeRequest({ muscleId: 'chest', value: 50.5 }, 'valid_token'));
    expect(res.status).toBe(400);
  });

  it('リクエストボディが JSON でない → 400', async () => {
    const req = new NextRequest('http://localhost/api/fatigue', {
      method: 'POST',
      headers: { authorization: 'Bearer valid_token', 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
