export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { MUSCLE_IDS } from '@/types/domain';

// 全 16 筋肉に value=0 のスナップショットを batch で一括挿入（履歴は消さない）（§3, §12-1）
export const PUT = withAuth(async (_req, { uid }) => {
  const now = new Date();
  const db = adminDb();
  const batch = db.batch();

  for (const muscleId of MUSCLE_IDS) {
    const ref = db.collection(`users/${uid}/fatigueSnapshots`).doc();
    batch.set(ref, {
      muscleId,
      value: 0,
      recordedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      source: 'manual',
      workoutSessionId: null,
    });
  }

  await batch.commit();
  return NextResponse.json({ resetAt: now.toISOString() });
});
