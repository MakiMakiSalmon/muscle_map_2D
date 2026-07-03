import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { getE2EAuthToken } from '@/lib/auth/e2eAuth';
import { applyDecay, calcRecoveryHoursRemaining } from '@/lib/fatigue/decay';
import { queryKeys } from '@/lib/queryKeys';
import { useUIStore } from '@/stores/uiStore';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import type { WorkoutHistoryResponse, WorkoutSaveResultDto } from '@/types/api';
import type { CurrentFatigueMap, Exercise, MuscleId } from '@/types/domain';

interface WorkoutSessionInput {
  performedAt: string;
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    weightKg: number | null;
    rpe: number | null;
  }[];
}

interface WorkoutMutationContext {
  previousCurrent?: CurrentFatigueMap;
}

async function getToken(): Promise<string> {
  const e2eToken = getE2EAuthToken();
  if (e2eToken) return e2eToken;
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

function findCachedExercise(exercises: Exercise[], exerciseId: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === exerciseId);
}

function getCachedExercises(queryClient: QueryClient): Exercise[] {
  return queryClient.getQueryData<Exercise[]>(queryKeys.exercises.all) ?? [];
}

export function predictWorkoutCurrent(
  current: CurrentFatigueMap,
  impacts: Partial<Record<MuscleId, number>>,
  performedAt: Date,
  now = new Date(),
): CurrentFatigueMap {
  const next: CurrentFatigueMap = { ...current };

  for (const [muscleId, rawDelta] of Object.entries(impacts) as [MuscleId, number][]) {
    const entry = current[muscleId];

    if (entry && new Date(entry.recordedAt).getTime() > performedAt.getTime()) {
      continue;
    }

    const baseAtPerformed = entry
      ? applyDecay(entry.savedValue, new Date(entry.recordedAt), muscleId, performedAt)
      : 0;
    const combined = Math.min(100, baseAtPerformed + rawDelta);

    if (combined === 0) {
      continue;
    }

    next[muscleId] = {
      savedValue: combined,
      currentValue: applyDecay(combined, performedAt, muscleId, now),
      recordedAt: performedAt.toISOString(),
      recoveryHoursRemaining: calcRecoveryHoursRemaining(combined, performedAt, muscleId, now),
    };
  }

  return next;
}

function predictWorkoutImpacts(
  input: WorkoutSessionInput,
  exercises: Exercise[],
): Partial<Record<MuscleId, number>> {
  return mergeImpacts(
    input.exercises.flatMap((workoutExercise) => {
      const exercise = findCachedExercise(exercises, workoutExercise.exerciseId);
      if (!exercise) return [];
      return [
        computeFatigueImpact(
          exercise,
          workoutExercise.sets,
          workoutExercise.reps,
          workoutExercise.rpe,
        ),
      ];
    }),
  );
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
  const pushToast = useUIStore((state) => state.pushToast);

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

    onMutate: async (input): Promise<WorkoutMutationContext> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.fatigue.current });

      const previousCurrent = queryClient.getQueryData<CurrentFatigueMap>(
        queryKeys.fatigue.current,
      );
      if (!previousCurrent) {
        return { previousCurrent };
      }

      const performedAt = new Date(input.performedAt);
      const impacts = predictWorkoutImpacts(input, getCachedExercises(queryClient));

      queryClient.setQueryData<CurrentFatigueMap>(
        queryKeys.fatigue.current,
        predictWorkoutCurrent(previousCurrent, impacts, performedAt),
      );

      return { previousCurrent };
    },

    onError: (_err, _input, context) => {
      if (context?.previousCurrent) {
        queryClient.setQueryData(queryKeys.fatigue.current, context.previousCurrent);
      }
      pushToast('error', 'トレーニング記録の保存に失敗しました。入力内容を確認して再試行してください。');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.workout.history });
    },
  });
}
