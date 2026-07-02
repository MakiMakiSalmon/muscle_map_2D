import type { Firestore } from 'firebase-admin/firestore';
import { type MuscleId, type FatigueSnapshot } from '@/types/domain';

export async function getLatestSnapshot(
  uid: string,
  muscleId: MuscleId,
  db: Firestore,
): Promise<FatigueSnapshot | null> {
  const snap = await db
    .collection(`users/${uid}/fatigueSnapshots`)
    .where('muscleId', '==', muscleId)
    .orderBy('recordedAt', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  const recordedAt = data.recordedAt.toDate();
  return {
    id: doc.id,
    muscleId: data.muscleId as MuscleId,
    value: data.value as number,
    recordedAt,
    createdAt: data.createdAt?.toDate?.() ?? recordedAt,
    source: data.source as 'manual' | 'workout',
    workoutSessionId: (data.workoutSessionId as string | undefined) ?? null,
  };
}
