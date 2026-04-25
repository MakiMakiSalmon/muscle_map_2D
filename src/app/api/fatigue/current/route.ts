export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { MUSCLE_IDS, type CurrentFatigueMap } from '@/types/domain';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';
import { applyDecay, calcRecoveryHoursRemaining } from '@/lib/fatigue/decay';

// 全 16 筋肉の回復計算済み疲労値を返す。未記録の筋肉は savedValue=0 で補完（§3, §12-4）
export const GET = withAuth(async (_req, { uid }) => {
  const now = new Date();

  const db = adminDb();
  const entries = await Promise.all(
    MUSCLE_IDS.map(async (muscleId) => {
      const snapshot = await getLatestSnapshot(uid, muscleId, db);
      if (!snapshot) {
        return [muscleId, {
          savedValue: 0,
          currentValue: 0,
          recordedAt: new Date(0).toISOString(),
          recoveryHoursRemaining: 0,
        }] as const;
      }
      return [muscleId, {
        savedValue: snapshot.value,
        currentValue: applyDecay(snapshot.value, snapshot.recordedAt, muscleId, now),
        recordedAt: snapshot.recordedAt.toISOString(),
        recoveryHoursRemaining: calcRecoveryHoursRemaining(
          snapshot.value,
          snapshot.recordedAt,
          muscleId,
          now,
        ),
      }] as const;
    })
  );

  const data = Object.fromEntries(entries) as CurrentFatigueMap;
  return NextResponse.json({ data });
});
