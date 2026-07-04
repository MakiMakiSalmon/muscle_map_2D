import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useUIStore } from '@/stores/uiStore';
import type { DeleteWorkoutResponse } from '@/types/api';

export class DeleteWorkoutError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'DeleteWorkoutError';
    this.status = status;
    this.code = code;
  }
}

async function getToken(): Promise<string> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  const pushToast = useUIStore((state) => state.pushToast);

  return useMutation({
    mutationFn: async (workoutId: string): Promise<DeleteWorkoutResponse> => {
      const token = await getToken();
      const res = await fetch(`/api/workout/${encodeURIComponent(workoutId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new DeleteWorkoutError(
          (err as { error?: string }).error ?? `HTTP ${res.status}`,
          res.status,
          (err as { code?: string }).code,
        );
      }
      return res.json() as Promise<DeleteWorkoutResponse>;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.workout.history });
      for (const muscleId of data.affectedMuscles) {
        queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.history(muscleId) });
      }
      pushToast('success', 'トレーニング記録を削除しました。');
    },

    onError: (err) => {
      if (err instanceof DeleteWorkoutError && err.code === 'HAS_NEWER_SNAPSHOT') {
        return;
      }
      pushToast('error', 'トレーニング記録の削除に失敗しました。再試行してください。');
    },
  });
}
