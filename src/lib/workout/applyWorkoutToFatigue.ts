import type { Firestore } from 'firebase-admin/firestore';
import { type MuscleId, type FatigueSnapshotInput } from '@/types/domain';
import { applyDecay } from '@/lib/fatigue/decay';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';

export async function applyWorkoutToFatigue(
  uid: string,
  impacts: Partial<Record<MuscleId, number>>,
  workoutSessionId: string,
  db: Firestore,
  performedAt: Date,
  now = new Date(),
): Promise<FatigueSnapshotInput[]> {
  const entries = Object.entries(impacts) as [MuscleId, number][];

  const snapshots: Array<FatigueSnapshotInput | null> = await Promise.all(
    entries.map(async ([muscleId, delta]): Promise<FatigueSnapshotInput | null> => {
      const latest = await getLatestSnapshot(uid, muscleId, db);

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
    }),
  );

  return snapshots.filter((snapshot): snapshot is FatigueSnapshotInput => snapshot !== null);
}
