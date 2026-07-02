import { useQuery } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { ExerciseDto, ExercisesResponse } from '@/types/api';

const EXERCISES_STALE_TIME = 24 * 60 * 60 * 1000;

async function fetchExercises(q?: string): Promise<ExerciseDto[]> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (q) {
    params.set('q', q);
    params.set('limit', '20');
  }
  const query = params.toString();
  const res = await fetch(`/api/exercises${query ? `?${query}` : ''}`, {
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
  const normalizedQuery = q.trim();

  return useQuery({
    queryKey: normalizedQuery
      ? queryKeys.exercises.list(normalizedQuery)
      : queryKeys.exercises.all,
    queryFn: () => fetchExercises(normalizedQuery || undefined),
    staleTime: EXERCISES_STALE_TIME,
  });
}

export function useAllExercises() {
  return useQuery({
    queryKey: queryKeys.exercises.all,
    queryFn: () => fetchExercises(),
    staleTime: EXERCISES_STALE_TIME,
  });
}
