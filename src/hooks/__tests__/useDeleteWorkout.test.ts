import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { queryKeys } from '@/lib/queryKeys';
import { useUIStore } from '@/stores/uiStore';
import { DeleteWorkoutError, useDeleteWorkout } from '../useDeleteWorkout';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return { wrapper: Wrapper, queryClient };
}

describe('useDeleteWorkout', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('成功時に current/workout.history/該当 muscle history を invalidate する', async () => {
    server.use(
      http.delete('/api/workout/session1', () =>
        HttpResponse.json({
          deletedSessionId: 'session1',
          affectedMuscles: ['chest', 'shoulders_left'],
        }),
      ),
    );

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteWorkout(), { wrapper });

    act(() => result.current.mutate('session1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.fatigue.current });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.workout.history });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.fatigue.history('chest') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.fatigue.history('shoulders_left') });
    expect(useUIStore.getState().toasts).toEqual([
      expect.objectContaining({ type: 'success', message: 'トレーニング記録を削除しました。' }),
    ]);
  });

  it('409 は HAS_NEWER_SNAPSHOT として呼び出し側へ渡し、Toast は出さない', async () => {
    server.use(
      http.delete('/api/workout/session1', () =>
        HttpResponse.json(
          { error: 'newer snapshot exists', code: 'HAS_NEWER_SNAPSHOT' },
          { status: 409 },
        ),
      ),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteWorkout(), { wrapper });

    act(() => result.current.mutate('session1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(DeleteWorkoutError);
    expect((result.current.error as DeleteWorkoutError).code).toBe('HAS_NEWER_SNAPSHOT');
    expect(useUIStore.getState().toasts).toEqual([]);
  });
});
