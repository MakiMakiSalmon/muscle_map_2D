import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/firebase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { CurrentFatigueMap, MuscleId } from '@/types/domain';
import type {
  CurrentFatigueResponse,
  FatigueHistoryResponse,
  FatigueSnapshotDto,
  ResetFatigueResponse,
} from '@/types/api';

async function getToken(): Promise<string> {
  const token = await clientAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function fetchCurrentFatigue(): Promise<CurrentFatigueMap> {
  const token = await getToken();
  const res = await fetch('/api/fatigue/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json as CurrentFatigueResponse).data;
}

async function fetchFatigueHistory(
  muscleId: MuscleId,
  limit = 20,
): Promise<FatigueSnapshotDto[]> {
  const token = await getToken();
  const params = new URLSearchParams({ muscleId, limit: String(limit) });
  const res = await fetch(`/api/fatigue/history?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json as FatigueHistoryResponse).history;
}

export function useFatigue() {
  return useQuery({
    queryKey: queryKeys.fatigue.current,
    queryFn: fetchCurrentFatigue,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFatigueHistory(muscleId: MuscleId, limit = 20) {
  return useQuery({
    queryKey: queryKeys.fatigue.history(muscleId),
    queryFn: () => fetchFatigueHistory(muscleId, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useResetFatigue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/fatigue/reset', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as ResetFatigueResponse;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: ['fatigue', 'history'] });
    },
  });
}
