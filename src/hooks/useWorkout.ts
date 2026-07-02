import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { WorkoutHistoryResponse, WorkoutSaveResultDto } from '@/types/api';

interface WorkoutSessionInput {
  performedAt: string;
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    weightKg: number | null;
  }[];
}

async function getToken(): Promise<string> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useWorkoutHistory(limit = 10, cursor?: string) {
  return useQuery({
    queryKey: [...queryKeys.workout.history, { limit, cursor }],
    queryFn: async (): Promise<WorkoutHistoryResponse> => {
      const token = await getToken();
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/workout/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<WorkoutHistoryResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkoutSessionInput): Promise<WorkoutSaveResultDto> => {
      const token = await getToken();
      const res = await fetch('/api/workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<WorkoutSaveResultDto>;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.workout.history });
    },
  });
}
