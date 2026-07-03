import type { Firestore } from 'firebase-admin/firestore';
import { type MuscleId, type FatigueSnapshotInput } from '@/types/domain';
import { applyDecay } from '@/lib/fatigue/decay';
import { readFatigueCurrent, type FatigueCurrentDocument } from '@/lib/fatigue/currentDoc';

export type WorkoutFatigueResult = {
  current: FatigueCurrentDocument | null;
  snapshots: FatigueSnapshotInput[];
};

export async function applyWorkoutToFatigue(
  uid: string,
  impacts: Partial<Record<MuscleId, number>>,
  workoutSessionId: string,
  db: Firestore,
  performedAt: Date,
  now = new Date(),
): Promise<WorkoutFatigueResult> {
  const entries = Object.entries(impacts) as [MuscleId, number][];
  const current = await readFatigueCurrent(uid, db);

  const snapshots: Array<FatigueSnapshotInput | null> = entries.map(([muscleId, delta]): FatigueSnapshotInput | null => {
    const latest = current?.muscles[muscleId];

    if (latest && latest.recordedAt.getTime() > performedAt.getTime()) {
      return null;
    }

    const baseAtPerformed = latest
      ? applyDecay(latest.value, latest.recordedAt, muscleId, performedAt)
      : 0;
    const nextValue = Math.min(100, baseAtPerformed + delta);

    if (nextValue === 0) return null;

    return {
      muscleId,
      value: nextValue,
      recordedAt: performedAt,
      createdAt: now,
      source: 'workout' as const,
      workoutSessionId,
    };
  });

  return {
    current,
    snapshots: snapshots.filter((snapshot): snapshot is FatigueSnapshotInput => snapshot !== null),
  };
}
