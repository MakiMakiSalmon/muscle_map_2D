export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { type Exercise, type MuscleGroup } from '@/types/domain';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import { applyWorkoutToFatigue } from '@/lib/workout/applyWorkoutToFatigue';
import { buildCurrentMerge, fatigueCurrentDocRef } from '@/lib/fatigue/currentDoc';

const workoutSchema = z.object({
  performedAt: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    // 現在時刻 + 5分まで許容
    return date.getTime() <= Date.now() + 5 * 60 * 1000;
  }, 'performedAt は過去の有効な ISO 8601 日時である必要があります'),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z.number().int().min(1).max(99),
        reps: z.number().int().min(1).max(999).nullable(),
        weightKg: z.number().min(0).max(999).nullable(),
        rpe: z.number().int().min(1).max(10).nullable().optional().transform((value) => value ?? null),
      })
    )
    .min(1)
    .max(50),
});

export const POST = withAuth(async (req: NextRequest, { uid }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { performedAt, exercises } = parsed.data;

  const db = adminDb();

  // 種目ドキュメントを並列取得（§12-4 と同様の並列化）
  const exerciseDocs = await Promise.all(
    exercises.map((ex) => db.collection('exercises').doc(ex.exerciseId).get())
  );

  const exerciseMap = new Map<string, Exercise>();
  for (let i = 0; i < exercises.length; i++) {
    const doc = exerciseDocs[i];
    if (!doc.exists) {
      return NextResponse.json(
        { error: `種目が見つかりません: ${exercises[i].exerciseId}`, code: 'EXERCISE_NOT_FOUND' },
        { status: 400 }
      );
    }
    const data = doc.data()!;
    exerciseMap.set(exercises[i].exerciseId, {
      id: doc.id,
      nameJa: data.nameJa as string,
      nameEn: data.nameEn as string,
      primaryMuscles: data.primaryMuscles as MuscleGroup[],
      secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
    });
  }

  // 疲労値デルタを計算（§4-2）
  const impacts = mergeImpacts(
    exercises.map((ex) => {
      const exercise = exerciseMap.get(ex.exerciseId)!;
      return computeFatigueImpact(exercise, ex.sets, ex.reps, ex.rpe);
    })
  );

  const now = new Date();
  const sessionRef = db.collection(`users/${uid}/workoutSessions`).doc();
  const sessionId = sessionRef.id;
  const performedAtDate = new Date(performedAt);

  // performedAt 時点の絶対値としてスナップショットを生成（docs/v3/design.md D4-1）
  const fatigueResult = await applyWorkoutToFatigue(uid, impacts, sessionId, db, performedAtDate, now);
  const { current, snapshots: fatigueSnapshots } = fatigueResult;

  // セッション + スナップショットを batch write で原子的に保存（§12-1）
  const batch = db.batch();

  batch.set(sessionRef, {
    performedAt: Timestamp.fromDate(performedAtDate),
    exercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: ex.weightKg,
      rpe: ex.rpe,
    })),
    fatigueImpacts: impacts,
  });

  for (const snapshot of fatigueSnapshots) {
    const snapshotRef = db.collection(`users/${uid}/fatigueSnapshots`).doc();
    batch.set(snapshotRef, {
      muscleId: snapshot.muscleId,
      value: snapshot.value,
      recordedAt: Timestamp.fromDate(snapshot.recordedAt),
      createdAt: Timestamp.fromDate(snapshot.createdAt),
      source: snapshot.source,
      workoutSessionId: snapshot.workoutSessionId,
    });
  }
  const currentMerge = buildCurrentMerge(current, fatigueSnapshots);
  if (currentMerge) {
    batch.set(fatigueCurrentDocRef(uid, db), currentMerge, { merge: true });
  }

  await batch.commit();

  return NextResponse.json(
    {
      session: {
        id: sessionId,
        performedAt: performedAtDate.toISOString(),
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weightKg: ex.weightKg,
          rpe: ex.rpe,
        })),
      },
      fatigueImpacts: impacts,
    },
    { status: 201 }
  );
});
