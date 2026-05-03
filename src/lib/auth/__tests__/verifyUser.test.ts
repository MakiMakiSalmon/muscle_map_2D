import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken }),
  adminDb: vi.fn().mockReturnValue({}),
}));

import { verifyUser, withAuth, UnauthorizedError } from '../verifyUser';

describe('verifyUser', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Authorization ヘッダーなし → UnauthorizedError', async () => {
    const req = new NextRequest('http://localhost/api/test');
    await expect(verifyUser(req)).rejects.toThrow(UnauthorizedError);
    await expect(verifyUser(req)).rejects.toThrow('Missing Bearer token');
  });

  it('Bearer プレフィックスなし → UnauthorizedError', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Token abc123' },
    });
    await expect(verifyUser(req)).rejects.toThrow(UnauthorizedError);
  });

  it('"Bearer " のみで空トークン → UnauthorizedError', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer ' },
    });
    await expect(verifyUser(req)).rejects.toThrow('Missing Bearer token');
  });

  it('トークン検証失敗 → UnauthorizedError', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer invalid_token' },
    });
    await expect(verifyUser(req)).rejects.toThrow(UnauthorizedError);
    await expect(verifyUser(req)).rejects.toThrow('Invalid token');
  });

  it('有効なトークン → uid を返す', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' } as never);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer valid_token' },
    });
    const result = await verifyUser(req);
    expect(result).toEqual({ uid: 'user_123' });
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid_token');
  });
});

describe('withAuth', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('認証なし → 401 を返す', async () => {
    const handler = vi.fn() as (req: NextRequest, ctx: { uid: string }) => Promise<NextResponse>;
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost/api/test');

    const res = await wrapped(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('認証成功 → ハンドラを uid 付きで呼ぶ', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_abc' } as never);
    const handler = vi.fn().mockResolvedValueOnce(NextResponse.json({ ok: true })) as (req: NextRequest, ctx: { uid: string }) => Promise<NextResponse>;
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer valid_token' },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req, { uid: 'user_abc' });
  });

  it('Firebase 認証エラー（auth/ プレフィックス）→ 401 を返す', async () => {
    const firebaseErr = Object.assign(new Error('auth/id-token-expired'), { code: 'auth/id-token-expired' });
    mockVerifyIdToken.mockRejectedValueOnce(firebaseErr);
    const handler = vi.fn() as (req: NextRequest, ctx: { uid: string }) => Promise<NextResponse>;
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer expired_token' },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('ハンドラが例外を投げる → 500 を返す', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_abc' } as never);
    const handler = vi.fn().mockRejectedValueOnce(new Error('DB error')) as (req: NextRequest, ctx: { uid: string }) => Promise<NextResponse>;
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer valid_token' },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});
