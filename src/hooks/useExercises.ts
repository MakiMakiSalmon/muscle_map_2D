import { useQuery } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { ExerciseDto, ExercisesResponse } from '@/types/api';

async function fetchExercises(q: string): Promise<ExerciseDto[]> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const params = new URLSearchParams({ limit: '20' });
  if (q) params.set('q', q);
  const res = await fetch(`/api/exercises?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json as ExercisesResponse).exercises;
}

export function useExercises(q = '') {
  return useQuery({
    queryKey: queryKeys.exercises.list(q),
    queryFn: () => fetchExercises(q),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
