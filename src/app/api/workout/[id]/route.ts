export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp, type DocumentReference, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { fatigueCurrentDocRef } from '@/lib/fatigue/currentDoc';
import type { MuscleId } from '@/types/domain';

type SnapshotDoc = {
  id: string;
  ref: DocumentReference;
  muscleId: MuscleId;
  value: number;
  recordedAt: Date;
  createdAt: Date;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
};

type RestoreEntry = {
  value: number;
  recordedAt: Date;
  createdAt: Date;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
};

const epoch = new Date(0);

function getWorkoutId(req: NextRequest): string {
  const pathname = new URL(req.url).pathname;
  return decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '');
}

function snapshotFromDoc(doc: QueryDocumentSnapshot): SnapshotDoc {
  const data = doc.data();
  return {
    id: doc.id,
    ref: doc.ref,
    muscleId: data.muscleId as MuscleId,
    value: Number(data.value ?? 0),
    recordedAt: data.recordedAt.toDate() as Date,
    createdAt: data.createdAt.toDate() as Date,
    source: data.source === 'workout' ? 'workout' : 'manual',
    workoutSessionId: (data.workoutSessionId as string | null) ?? null,
  };
}

function restoreEntryFromSnapshot(snapshot: SnapshotDoc | undefined): RestoreEntry {
  if (!snapshot) {
    return {
      value: 0,
      recordedAt: epoch,
      createdAt: epoch,
      source: 'manual',
      workoutSessionId: null,
    };
  }

  return {
    value: snapshot.value,
    recordedAt: snapshot.recordedAt,
    createdAt: snapshot.createdAt,
    source: snapshot.source,
    workoutSessionId: snapshot.workoutSessionId,
  };
}

export const DELETE = withAuth(async (req: NextRequest, { uid }) => {
  const workoutId = getWorkoutId(req);
  if (!workoutId) {
    return NextResponse.json(
      { error: 'Workout id is required', code: 'INVALID_WORKOUT_ID' },
      { status: 400 },
    );
  }

  const db = adminDb();
  const sessionRef = db.collection(`users/${uid}/workoutSessions`).doc(workoutId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    return NextResponse.json(
      { error: 'Workout session not found', code: 'WORKOUT_SESSION_NOT_FOUND' },
      { status: 404 },
    );
  }

  const snapshotsSnap = await db
    .collection(`users/${uid}/fatigueSnapshots`)
    .where('workoutSessionId', '==', workoutId)
    .get();

  const targetSnapshots = snapshotsSnap.docs.map(snapshotFromDoc);
  const affectedMuscles = Array.from(
    new Set(targetSnapshots.map((snapshot) => snapshot.muscleId)),
  );
  const targetByMuscle = new Map(targetSnapshots.map((snapshot) => [snapshot.muscleId, snapshot]));

  const latestByMuscle = await Promise.all(
    affectedMuscles.map(async (muscleId) => {
      const latestSnap = await db
        .collection(`users/${uid}/fatigueSnapshots`)
        .where('muscleId', '==', muscleId)
        .orderBy('recordedAt', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(2)
        .get();

      return [muscleId, latestSnap.docs.map(snapshotFromDoc)] as const;
    }),
  );

  const restoreByMuscle = new Map<MuscleId, RestoreEntry>();
  for (const [muscleId, latestSnapshots] of latestByMuscle) {
    const target = targetByMuscle.get(muscleId);
    if (!target || latestSnapshots[0]?.id !== target.id) {
      return NextResponse.json(
        {
          error: 'この記録より新しい記録があるため削除できません',
          code: 'HAS_NEWER_SNAPSHOT',
          muscleId,
        },
        { status: 409 },
      );
    }
    restoreByMuscle.set(muscleId, restoreEntryFromSnapshot(latestSnapshots[1]));
  }

  const now = new Date();
  const batch = db.batch();
  batch.delete(sessionRef);
  for (const snapshot of targetSnapshots) {
    batch.delete(snapshot.ref);
  }

  if (affectedMuscles.length > 0) {
    const muscles = Object.fromEntries(
      affectedMuscles.map((muscleId) => {
        const entry = restoreByMuscle.get(muscleId) ?? restoreEntryFromSnapshot(undefined);
        return [
          muscleId,
          {
            value: entry.value,
            recordedAt: Timestamp.fromDate(entry.recordedAt),
            createdAt: Timestamp.fromDate(entry.createdAt),
            source: entry.source,
            workoutSessionId: entry.workoutSessionId,
          },
        ];
      }),
    ) as Partial<Record<MuscleId, unknown>>;

    batch.set(
      fatigueCurrentDocRef(uid, db),
      {
        muscles,
        updatedAt: Timestamp.fromDate(now),
      },
      { merge: true },
    );
  }

  await batch.commit();

  return NextResponse.json({
    deletedSessionId: workoutId,
    affectedMuscles,
  });
});
