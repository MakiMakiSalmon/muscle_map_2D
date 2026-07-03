export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { MUSCLE_IDS, type FatigueSnapshotInput } from '@/types/domain';
import { buildCurrentMerge, fatigueCurrentDocRef, readFatigueCurrent } from '@/lib/fatigue/currentDoc';

const fatigueSchema = z.object({
  muscleId: z.enum(MUSCLE_IDS),
  value: z.number().int().min(0).max(100),
});

export const POST = withAuth(async (req: NextRequest, { uid }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = fatigueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { muscleId, value } = parsed.data;
  const now = new Date();
  const db = adminDb();
  const existingCurrent = await readFatigueCurrent(uid, db);
  const ref = db.collection(`users/${uid}/fatigueSnapshots`).doc();
  const batch = db.batch();
  const snapshot: FatigueSnapshotInput = {
    muscleId,
    value,
    recordedAt: now,
    createdAt: now,
    source: 'manual',
    workoutSessionId: null,
  };

  batch.set(ref, {
    muscleId,
    value,
    recordedAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    source: 'manual',
    workoutSessionId: null,
  });
  const currentMerge = buildCurrentMerge(existingCurrent, [snapshot]);
  if (currentMerge) {
    batch.set(fatigueCurrentDocRef(uid, db), currentMerge, { merge: true });
  }
  await batch.commit();

  return NextResponse.json(
    {
      snapshot: {
        id: ref.id,
        muscleId,
        value,
        recordedAt: now.toISOString(),
        createdAt: now.toISOString(),
        source: 'manual',
        workoutSessionId: null,
      },
    },
    { status: 201 }
  );
});
