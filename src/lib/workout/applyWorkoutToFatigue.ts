import type { Firestore } from 'firebase-admin/firestore';
import { type MuscleId, type FatigueSnapshot } from '@/types/domain';
import { applyDecay } from '@/lib/fatigue/decay';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';

export async function applyWorkoutToFatigue(
  uid: string,
  impacts: Partial<Record<MuscleId, number>>,
  workoutSessionId: string,
  db: Firestore,
  now = new Date(),
): Promise<Array<Pick<FatigueSnapshot, 'muscleId' | 'value' | 'source' | 'workoutSessionId'> & { recordedAt: Date }>> {
  const entries = Object.entries(impacts) as [MuscleId, number][];

  const snapshots = await Promise.all(
    entries.map(async ([muscleId, delta]) => {
      const latest = await getLatestSnapshot(uid, muscleId, db);
      const currentValue = latest
        ? applyDecay(latest.value, latest.recordedAt, muscleId, now)
        : 0;
      const nextValue = Math.min(100, currentValue + delta);

      return {
        muscleId,
        value: nextValue,
        recordedAt: now,
        source: 'workout' as const,
        workoutSessionId,
      };
    }),
  );

  return snapshots;
}
