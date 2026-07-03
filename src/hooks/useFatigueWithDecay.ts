import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchCurrentFatigue } from '@/hooks/useFatigue';
import { applyDecay, calcRecoveryHoursRemaining } from '@/lib/fatigue/decay';
import type { CurrentFatigueEntry, CurrentFatigueMap, MuscleId } from '@/types/domain';

interface FatigueWithDecayResult {
  data: CurrentFatigueMap | null;
  isError: boolean;
  isUnauthorized: boolean;
  refetch: () => void;
}

function isUnauthorizedError(error: Error | null): boolean {
  return 'status' in (error ?? {}) && (error as { status?: number }).status === 401;
}

export function useFatigueWithDecay(): FatigueWithDecayResult {
  const { data, error, isError, refetch } = useQuery({
    queryKey: queryKeys.fatigue.current,
    queryFn: fetchCurrentFatigue,
    staleTime: 5 * 60 * 1000,
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const decayedData = useMemo(() => {
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

  return {
    data: decayedData,
    isError,
    isUnauthorized: isUnauthorizedError(error),
    refetch: () => {
      void refetch();
    },
  };
}
