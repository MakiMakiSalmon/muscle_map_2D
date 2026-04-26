import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchCurrentFatigue } from '@/hooks/useFatigue';
import { applyDecay, calcRecoveryHoursRemaining } from '@/lib/fatigue/decay';
import type { CurrentFatigueEntry, CurrentFatigueMap, MuscleId } from '@/types/domain';

export function useFatigueWithDecay(): CurrentFatigueMap | null {
  const { data } = useQuery({
    queryKey: queryKeys.fatigue.current,
    queryFn: fetchCurrentFatigue,
    staleTime: 5 * 60 * 1000,
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const result = {} as CurrentFatigueMap;
    for (const [muscleId, raw] of Object.entries(data) as [MuscleId, CurrentFatigueEntry][]) {
      const recordedAt = new Date(raw.recordedAt);
      result[muscleId] = {
        savedValue: raw.savedValue,
        currentValue: applyDecay(raw.savedValue, recordedAt, muscleId, now),
        recordedAt: raw.recordedAt,
        recoveryHoursRemaining: calcRecoveryHoursRemaining(
          raw.savedValue,
          recordedAt,
          muscleId,
          now,
        ),
      };
    }
    return result;
  }, [data, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}
