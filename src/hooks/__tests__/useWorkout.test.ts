import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { queryKeys } from '@/lib/queryKeys';
import { applyDecay } from '@/lib/fatigue/decay';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import { useUIStore } from '@/stores/uiStore';
import { MUSCLE_IDS, type CurrentFatigueMap, type Exercise } from '@/types/domain';
import { predictWorkoutCurrent, useWorkout } from '../useWorkout';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

const now = new Date('2026-07-03T03:00:00.000Z');
const performedAt = new Date('2026-07-02T03:00:00.000Z');

const benchPress: Exercise = {
  id: 'bench_press',
  nameJa: 'ベンチプレス',
  nameEn: 'bench_press',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders'],
};

function makeCurrentMap(overrides: Partial<CurrentFatigueMap> = {}): CurrentFatigueMap {
  const base = Object.fromEntries(
    MUSCLE_IDS.map((id) => [
      id,
      {
        savedValue: 0,
        currentValue: 0,
        recordedAt: new Date(0).toISOString(),
        recoveryHoursRemaining: 0,
      },
    ]),
  ) as CurrentFatigueMap;

  return { ...base, ...overrides };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return { wrapper: Wrapper, queryClient };
}

describe('predictWorkoutCurrent', () => {
  it('D4-1 と同じ計算で performedAt 時点クランプ後の現在値を予測する', () => {
    const current = makeCurrentMap({
      chest: {
        savedValue: 80,
        currentValue: 40,
        recordedAt: performedAt.toISOString(),
        recoveryHoursRemaining: 24,
      },
    });
    const impacts = mergeImpacts([
      computeFatigueImpact(benchPress, 3, 10),
    ]);

    const predicted = predictWorkoutCurrent(current, impacts, performedAt, now);

    expect(predicted.chest.savedValue).toBe(100);
    expect(predicted.chest.currentValue).toBe(applyDecay(100, performedAt, 'chest', now));
    expect(predicted.chest.currentValue).toBe(50);
    expect(predicted.chest.recordedAt).toBe(performedAt.toISOString());
    expect(predicted.shoulders_left.currentValue).toBe(10);
    expect(predicted.triceps_left.currentValue).toBe(20);
  });

  it('順序逆転の筋肉は楽観更新しない', () => {
    const newerRecordedAt = new Date(performedAt.getTime() + 60_000);
    const current = makeCurrentMap({
      chest: {
        savedValue: 70,
        currentValue: 70,
        recordedAt: newerRecordedAt.toISOString(),
        recoveryHoursRemaining: 48,
      },
    });

    const predicted = predictWorkoutCurrent(current, { chest: 40 }, performedAt, now);

    expect(predicted.chest).toEqual(current.chest);
  });
});

describe('useWorkout', () => {
  beforeEach(() => {
    useUIStore.setState({ pushToast: undefined } as Partial<ReturnType<typeof useUIStore.getState>>);
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json({
          data: makeCurrentMap({
            chest: {
              savedValue: 80,
              currentValue: 40,
              recordedAt: performedAt.toISOString(),
              recoveryHoursRemaining: 24,
            },
          }),
        }),
      ),
    );
  });

  it('onMutate で current キャッシュを即時更新する', async () => {
    const mutationPerformedAt = new Date(Date.now() - 24 * 3600 * 1000);
    let resolvePost!: () => void;
    server.use(
      http.post('/api/workout', () =>
        new Promise<Response>((resolve) => {
          resolvePost = () =>
            resolve(
              HttpResponse.json(
                {
                  session: {
                    id: 'session1',
                    performedAt: mutationPerformedAt.toISOString(),
                    exercises: [],
                  },
                  fatigueImpacts: { chest: 40 },
                },
                { status: 201 },
              ),
            );
        }),
      ),
    );

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.exercises.all, [benchPress]);
    queryClient.setQueryData<CurrentFatigueMap>(
      queryKeys.fatigue.current,
      makeCurrentMap({
        chest: {
          savedValue: 80,
          currentValue: 40,
          recordedAt: mutationPerformedAt.toISOString(),
          recoveryHoursRemaining: 24,
        },
      }),
    );

    const { result } = renderHook(() => useWorkout(), { wrapper });

    act(() => {
      result.current.mutate({
        performedAt: mutationPerformedAt.toISOString(),
        exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null }],
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current);
      expect(cached?.chest.savedValue).toBe(100);
      expect(cached?.chest.currentValue).toBeGreaterThanOrEqual(49);
      expect(cached?.chest.currentValue).toBeLessThanOrEqual(50);
    });

    resolvePost();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('楽観更新には全件種目キャッシュだけを使う', async () => {
    let resolvePost!: () => void;
    server.use(
      http.post('/api/workout', () =>
        new Promise<Response>((resolve) => {
          resolvePost = () =>
            resolve(
              HttpResponse.json(
                {
                  session: {
                    id: 'session1',
                    performedAt: performedAt.toISOString(),
                    exercises: [],
                  },
                  fatigueImpacts: { chest: 40 },
                },
                { status: 201 },
              ),
            );
        }),
      ),
    );

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.exercises.list('ベンチ'), [benchPress]);
    queryClient.setQueryData<CurrentFatigueMap>(
      queryKeys.fatigue.current,
      makeCurrentMap({
        chest: {
          savedValue: 80,
          currentValue: 40,
          recordedAt: performedAt.toISOString(),
          recoveryHoursRemaining: 24,
        },
      }),
    );

    const { result } = renderHook(() => useWorkout(), { wrapper });

    act(() => {
      result.current.mutate({
        performedAt: performedAt.toISOString(),
        exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null }],
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current);
      expect(cached?.chest.savedValue).toBe(80);
    });

    resolvePost();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('保存失敗時に current キャッシュをロールバックして Toast を呼ぶ', async () => {
    const toastSpy = vi.fn();
    server.use(
      http.post('/api/workout', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );
    useUIStore.setState({
      pushToast: toastSpy,
    } as Partial<ReturnType<typeof useUIStore.getState>>);

    const previous = makeCurrentMap({
      chest: {
        savedValue: 80,
        currentValue: 40,
        recordedAt: performedAt.toISOString(),
        recoveryHoursRemaining: 24,
      },
    });
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(queryKeys.exercises.all, [benchPress]);
    queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, previous);

    const { result } = renderHook(() => useWorkout(), { wrapper });

    act(() => {
      result.current.mutate({
        performedAt: performedAt.toISOString(),
        exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current)).toEqual(previous);
    expect(toastSpy).toHaveBeenCalledWith('error', 'Internal error');
  });
});
