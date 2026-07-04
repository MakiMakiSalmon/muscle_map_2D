import type { Firestore } from 'firebase-admin/firestore';
import { type MuscleId, type FatigueSnapshot } from '@/types/domain';

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

function toSnapshot(doc: SnapshotDoc): FatigueSnapshot {
  const data = doc.data();
  const recordedAt = (data.recordedAt as { toDate: () => Date }).toDate();
  return {
    id: doc.id,
    muscleId: data.muscleId as MuscleId,
    value: data.value as number,
    recordedAt,
    createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? recordedAt,
    source: data.source as 'manual' | 'workout',
    workoutSessionId: (data.workoutSessionId as string | undefined) ?? null,
  };
}

export async function getLatestSnapshot(
  uid: string,
  muscleId: MuscleId,
  db: Firestore,
): Promise<FatigueSnapshot | null> {
  const collection = db.collection(`users/${uid}/fatigueSnapshots`);
  const latestWithTieBreakQuery = collection
    .where('muscleId', '==', muscleId)
    .orderBy('recordedAt', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(1);
  const latestLegacyQuery = collection
    .where('muscleId', '==', muscleId)
    .orderBy('recordedAt', 'desc')
    .limit(1);

  const [latestWithTieBreak, latestLegacy] = await Promise.all([
    latestWithTieBreakQuery.get(),
    latestLegacyQuery.get(),
  ]);

  const candidates = [latestWithTieBreak, latestLegacy]
    .flatMap((snap) => (snap.empty ? [] : [toSnapshot(snap.docs[0])]))
    .sort((a, b) => {
      const recordedDiff = b.recordedAt.getTime() - a.recordedAt.getTime();
      if (recordedDiff !== 0) return recordedDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return candidates[0] ?? null;
}
