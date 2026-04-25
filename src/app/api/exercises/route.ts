export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/verifyUser';
import { adminDb } from '@/lib/firebase/admin';
import { type Exercise, type MuscleGroup } from '@/types/domain';

// Firestore prefix 検索で使う Private Use Area 末尾コードポイント（§2 クエリ設計）
const FIRESTORE_PREFIX_SUFFIX = '';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));

  const baseQuery = q
    ? adminDb
        .collection('exercises')
        .where('nameJa', '>=', q)
        .where('nameJa', '<=', q + FIRESTORE_PREFIX_SUFFIX)
        .limit(limit)
    : adminDb.collection('exercises').limit(limit);

  const snap = await baseQuery.get();

  const exercises: Exercise[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      nameJa: data.nameJa as string,
      nameEn: data.nameEn as string,
      primaryMuscles: data.primaryMuscles as MuscleGroup[],
      secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
    };
  });

  return NextResponse.json({ exercises });
});
