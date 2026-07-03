import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { MUSCLE_IDS, type FatigueSnapshotInput, type MuscleId } from '@/types/domain';

export type FatigueCurrentMuscleEntry = {
  value: number;
  recordedAt: Date;
  createdAt: Date;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
};

export type FatigueCurrentDocument = {
  muscles: Partial<Record<MuscleId, FatigueCurrentMuscleEntry>>;
  updatedAt: Date;
};

export type FatigueCurrentMerge = {
  muscles: Partial<Record<MuscleId, {
    value: number;
    recordedAt: Timestamp;
    createdAt: Timestamp;
    source: 'manual' | 'workout';
    workoutSessionId: string | null;
  }>>;
  updatedAt: Timestamp;
};

type TimestampLike = {
  toDate: () => Date;
};

type CurrentDocData = {
  muscles?: Partial<Record<MuscleId, {
    value?: unknown;
    recordedAt?: TimestampLike;
    createdAt?: TimestampLike;
    source?: unknown;
    workoutSessionId?: unknown;
  }>>;
  updatedAt?: TimestampLike;
};

function isNewerOrSame(a: Pick<FatigueCurrentMuscleEntry, 'recordedAt' | 'createdAt'>, b: Pick<FatigueCurrentMuscleEntry, 'recordedAt' | 'createdAt'>): boolean {
  const recordedDiff = a.recordedAt.getTime() - b.recordedAt.getTime();
  if (recordedDiff !== 0) return recordedDiff > 0;
  return a.createdAt.getTime() >= b.createdAt.getTime();
}

export function fatigueCurrentDocRef(uid: string, db: Firestore) {
  return db.collection(`users/${uid}/state`).doc('fatigueCurrent');
}

export async function readFatigueCurrent(uid: string, db: Firestore): Promise<FatigueCurrentDocument | null> {
  const doc = await fatigueCurrentDocRef(uid, db).get();
  if (!doc.exists) return null;

  const data = doc.data() as CurrentDocData | undefined;
  const muscles: FatigueCurrentDocument['muscles'] = {};

  for (const muscleId of MUSCLE_IDS) {
    const entry = data?.muscles?.[muscleId];
    if (!entry?.recordedAt || !entry.createdAt) continue;

    muscles[muscleId] = {
      value: Number(entry.value ?? 0),
      recordedAt: entry.recordedAt.toDate(),
      createdAt: entry.createdAt.toDate(),
      source: entry.source === 'workout' ? 'workout' : 'manual',
      workoutSessionId: typeof entry.workoutSessionId === 'string' ? entry.workoutSessionId : null,
    };
  }

  return {
    muscles,
    updatedAt: data?.updatedAt?.toDate() ?? new Date(0),
  };
}

export function buildCurrentMerge(
  existing: FatigueCurrentDocument | null,
  snapshots: FatigueSnapshotInput[],
): FatigueCurrentMerge | null {
  const nextMuscles: FatigueCurrentDocument['muscles'] = {};

  for (const snapshot of snapshots) {
    const candidate: FatigueCurrentMuscleEntry = {
      value: snapshot.value,
      recordedAt: snapshot.recordedAt,
      createdAt: snapshot.createdAt,
      source: snapshot.source,
      workoutSessionId: snapshot.workoutSessionId,
    };
    const currentCandidate = nextMuscles[snapshot.muscleId];
    if (!currentCandidate || isNewerOrSame(candidate, currentCandidate)) {
      nextMuscles[snapshot.muscleId] = candidate;
    }
  }

  const muscles: FatigueCurrentMerge['muscles'] = {};
  let updatedAt: Date | null = null;

  for (const [muscleId, candidate] of Object.entries(nextMuscles) as [MuscleId, FatigueCurrentMuscleEntry][]) {
    const current = existing?.muscles[muscleId];
    if (current && !isNewerOrSame(candidate, current)) continue;

    muscles[muscleId] = {
      value: candidate.value,
      recordedAt: Timestamp.fromDate(candidate.recordedAt),
      createdAt: Timestamp.fromDate(candidate.createdAt),
      source: candidate.source,
      workoutSessionId: candidate.workoutSessionId,
    };
    if (!updatedAt || candidate.createdAt.getTime() > updatedAt.getTime()) {
      updatedAt = candidate.createdAt;
    }
  }

  if (Object.keys(muscles).length === 0 || !updatedAt) return null;

  return {
    muscles,
    updatedAt: Timestamp.fromDate(updatedAt),
  };
}
