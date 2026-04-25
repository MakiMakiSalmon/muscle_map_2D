import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Bearer トークンを検証し uid を返す。失敗時は UnauthorizedError を投げる。
export async function verifyUser(req: NextRequest): Promise<{ uid: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Bearer token');
  }
  const idToken = authHeader.substring(7);
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch {
    throw new UnauthorizedError('Invalid token');
  }
}

// 認証・エラーハンドリングを共通化する API ルートラッパー（§15）
export function withAuth(
  handler: (req: NextRequest, ctx: { uid: string }) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      const { uid } = await verifyUser(req);
      return await handler(req, { uid });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: err.message, code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      console.error('[withAuth] Unexpected error:', err);
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}
