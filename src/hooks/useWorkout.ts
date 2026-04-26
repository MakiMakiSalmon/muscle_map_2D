import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { WorkoutSaveResult, WorkoutSession } from '@/types/domain';

interface WorkoutSessionInput {
  performedAt: string;
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    weightKg: number | null;
  }[];
}

interface WorkoutHistoryResponse {
  sessions: WorkoutSession[];
  nextCursor: string | null;
}

async function getToken(): Promise<string> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

// GET /api/workout/history は Step 3 実装漏れのため現在サーバーに存在しない。
// enabled: false で無効化し、Step 3 修正 PR（別途）でルートを追加してから有効化する。
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
    enabled: false,
  });
}

export function useWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkoutSessionInput): Promise<WorkoutSaveResult> => {
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
      return res.json() as Promise<WorkoutSaveResult>;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.workout.history });
    },
  });
}
