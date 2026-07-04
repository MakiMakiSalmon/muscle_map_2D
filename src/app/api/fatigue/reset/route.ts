export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { MUSCLE_IDS, type FatigueSnapshotInput } from '@/types/domain';
import { buildCurrentMerge, fatigueCurrentDocRef } from '@/lib/fatigue/currentDoc';

// 全 16 筋肉に value=0 のスナップショットを batch で一括挿入（履歴は消さない）（§3, §12-1）
export const PUT = withAuth(async (_req, { uid }) => {
  const now = new Date();
  const db = adminDb();
  const batch = db.batch();
  const snapshots: FatigueSnapshotInput[] = [];

  for (const muscleId of MUSCLE_IDS) {
    const ref = db.collection(`users/${uid}/fatigueSnapshots`).doc();
    snapshots.push({
      muscleId,
      value: 0,
      recordedAt: now,
      createdAt: now,
      source: 'manual',
      workoutSessionId: null,
    });
    batch.set(ref, {
      muscleId,
      value: 0,
      recordedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      source: 'manual',
      workoutSessionId: null,
    });
  }
  const currentMerge = buildCurrentMerge(null, snapshots);
  if (currentMerge) {
    batch.set(fatigueCurrentDocRef(uid, db), currentMerge, { merge: true });
  }

  await batch.commit();
  return NextResponse.json({ resetAt: now.toISOString() });
});
