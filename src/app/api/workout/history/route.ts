export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import type { WorkoutExerciseInput, WorkoutSession } from '@/types/domain';

export const GET = withAuth(async (req: NextRequest, { uid }) => {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '10', 10) || 10));

  const db = adminDb();
  const collectionRef = db.collection(`users/${uid}/workoutSessions`);

  let query = collectionRef.orderBy('performedAt', 'desc').limit(limit + 1);

  if (cursor) {
    const cursorDoc = await collectionRef.doc(cursor).get();
    if (!cursorDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid cursor', code: 'INVALID_CURSOR' },
        { status: 400 },
      );
    }
    query = query.startAfter(cursorDoc);
  }

  const snap = await query.get();

  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;

  const sessions: WorkoutSession[] = resultDocs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      performedAt: data.performedAt.toDate().toISOString(),
      exercises: data.exercises as WorkoutExerciseInput[],
    };
  });

  const nextCursor = hasMore ? (resultDocs[resultDocs.length - 1].id ?? null) : null;

  return NextResponse.json({ sessions, nextCursor });
});
