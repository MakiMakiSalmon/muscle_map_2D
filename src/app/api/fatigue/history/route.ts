export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { MUSCLE_IDS, type MuscleId } from '@/types/domain';

export const GET = withAuth(async (req: NextRequest, { uid }) => {
  const { searchParams } = new URL(req.url);
  const muscleId = searchParams.get('muscleId');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));

  if (!muscleId || !(MUSCLE_IDS as readonly string[]).includes(muscleId)) {
    return NextResponse.json(
      { error: 'Invalid or missing muscleId', code: 'INVALID_PARAMS' },
      { status: 400 }
    );
  }

  const snap = await adminDb()
    .collection(`users/${uid}/fatigueSnapshots`)
    .where('muscleId', '==', muscleId)
    .orderBy('recordedAt', 'desc')
    .limit(limit)
    .get();

  const history = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      muscleId: data.muscleId as MuscleId,
      value: data.value as number,
      recordedAt: (data.recordedAt.toDate() as Date).toISOString(),
      source: data.source as 'manual' | 'workout',
      workoutSessionId: (data.workoutSessionId as string | null) ?? null,
    };
  });

  return NextResponse.json({ history });
});
