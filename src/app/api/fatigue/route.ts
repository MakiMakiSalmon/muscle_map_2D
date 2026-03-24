import { NextRequest, NextResponse } from 'next/server';
import { handleFirebaseError } from '@/lib/firebaseErrorHandler';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

const defaultFatigueData: { [key: string]: number } = {
  head: 0,
  shoulders: 0,
  chest: 0,
  back: 0,
  abs: 0,
  biceps: 0,
  triceps: 0,
  forearms: 0,
  forearms_right: 0,
  thighs: 0,
  calves: 0,
  thighs_right: 0,
  calves_right: 0,
};

const FATIGUE_DOC_ID = 'current';

async function verifyUser(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

function getUserFatigueRef(uid: string) {
  return adminDb.collection('users').doc(uid).collection('fatigue').doc(FATIGUE_DOC_ID);
}

// GET: 疲労度データを取得
export async function GET(request: NextRequest) {
  try {
    const uid = await verifyUser(request);
    const ref = getUserFatigueRef(uid);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      await ref.set({
        data: { ...defaultFatigueData },
        updatedAt: Date.now(),
      });
      return NextResponse.json({ ...defaultFatigueData });
    }

    const data = snapshot.data();
    return NextResponse.json(data?.data ?? defaultFatigueData);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const errorResponse = handleFirebaseError(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}

// POST: 疲労度データを保存
export async function POST(request: NextRequest) {
  try {
    const uid = await verifyUser(request);
    const body = await request.json();
    const ref = getUserFatigueRef(uid);
    const snapshot = await ref.get();
    const currentData = snapshot.exists
      ? { ...(snapshot.data()?.data ?? defaultFatigueData) }
      : { ...defaultFatigueData };

    // 特定の筋肉グループの疲労度を更新（置換モード）
    if (body.muscle && typeof body.tire === 'number') {
      currentData[body.muscle] = Math.min(100, Math.max(0, body.tire));
    }

    await ref.set({
      data: currentData,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, data: currentData });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const errorResponse = handleFirebaseError(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}

// PUT: すべての疲労度データをリセット
export async function PUT(request: NextRequest) {
  try {
    const uid = await verifyUser(request);
    const ref = getUserFatigueRef(uid);
    const resetData = { ...defaultFatigueData };

    await ref.set({
      data: resetData,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, data: resetData });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const errorResponse = handleFirebaseError(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
