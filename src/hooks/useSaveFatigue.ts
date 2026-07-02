// NOTE: このファイルは CLAUDE.md Step 4 スコープ表に明記されていないが、
// §16 の楽観的更新設計を実現するために useFatigue.ts と同 PR に含める。
// 理由: FatigueSlider（Step 5）が依存するため Step 5 より前に必要。
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import { MUSCLE_RECOVERY_HOURS } from '@/types/domain';
import type { CurrentFatigueMap, MuscleId } from '@/types/domain';
import type { SaveFatigueResponse } from '@/types/api';

export function useSaveFatigue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ muscleId, value }: { muscleId: MuscleId; value: number }) => {
      const token = await clientAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/fatigue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ muscleId, value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return (json as SaveFatigueResponse).snapshot;
    },

    onMutate: async ({ muscleId, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.fatigue.current });

      const previous = queryClient.getQueryData<CurrentFatigueMap>(
        queryKeys.fatigue.current,
      );

      if (previous) {
        queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, {
          ...previous,
          [muscleId]: {
            savedValue: value,
            currentValue: value,
            recordedAt: new Date().toISOString(),
            recoveryHoursRemaining: MUSCLE_RECOVERY_HOURS[muscleId],
          },
        });
      }

      return { previousEntry: previous?.[muscleId], muscleId };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousEntry) {
        const current = queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current);
        if (current) {
          queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, {
            ...current,
            [context.muscleId]: context.previousEntry,
          });
        }
      }
    },

    onSettled: (_data, _err, { muscleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.history(muscleId) });
    },
  });
}
