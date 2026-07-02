import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useSaveFatigue } from '../useSaveFatigue';
import type { CurrentFatigueMap } from '@/types/domain';
import { MUSCLE_IDS } from '@/types/domain';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

function makeSnapshot(muscleId: string, value: number) {
  return {
    id: 'snap1',
    muscleId,
    value,
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    source: 'manual',
    workoutSessionId: null,
  };
}

function makeCurrentMap(chestValue: number): CurrentFatigueMap {
  const now = new Date().toISOString();
  return Object.fromEntries(
    MUSCLE_IDS.map((id) => [
      id,
      {
        savedValue: id === 'chest' ? chestValue : 0,
        currentValue: id === 'chest' ? chestValue : 0,
        recordedAt: now,
        recoveryHoursRemaining: 0,
      },
    ]),
  ) as CurrentFatigueMap;
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

describe('useSaveFatigue', () => {
  beforeEach(() => {
    // onSettled の invalidateQueries が再フェッチを起こすので GET ハンドラーを用意
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json({ data: makeCurrentMap(30) }),
      ),
    );
  });

  it('保存成功 → fatigue.current と fatigue.history を invalidate する', async () => {
    server.use(
      http.post('/api/fatigue', () =>
        HttpResponse.json({ snapshot: makeSnapshot('chest', 75) }, { status: 201 }),
      ),
    );
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSaveFatigue(), { wrapper });

    act(() => {
      result.current.mutate({ muscleId: 'chest', value: 75 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['fatigue', 'current'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['fatigue', 'history', 'chest'] }),
    );
  });

  it('onMutate → chest のキャッシュが楽観的に更新され、他筋肉は変わらない', async () => {
    // POST を遅延させて onMutate 後のキャッシュ状態を確認する
    let resolvePost!: () => void;
    server.use(
      http.post('/api/fatigue', () =>
        new Promise<Response>((resolve) => {
          resolvePost = () =>
            resolve(
              HttpResponse.json(
                { snapshot: makeSnapshot('chest', 75) },
                { status: 201 },
              ),
            );
        }),
      ),
    );

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData<CurrentFatigueMap>(['fatigue', 'current'], makeCurrentMap(30));

    const { result } = renderHook(() => useSaveFatigue(), { wrapper });

    act(() => {
      result.current.mutate({ muscleId: 'chest', value: 75 });
    });

    // onMutate（キャッシュ楽観的更新）が完了するまで待つ
    await waitFor(() => {
      const cached = queryClient.getQueryData<CurrentFatigueMap>(['fatigue', 'current']);
      expect(cached?.chest.savedValue).toBe(75);
    });

    const cached = queryClient.getQueryData<CurrentFatigueMap>(['fatigue', 'current']);
    expect(cached?.back.savedValue).toBe(0); // 他筋肉は変わらない

    // POST を完了させて後処理を走らせる
    resolvePost();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('保存失敗 → 失敗した筋肉のキャッシュだけがロールバックされる', async () => {
    server.use(
      http.post('/api/fatigue', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData<CurrentFatigueMap>(['fatigue', 'current'], makeCurrentMap(30));

    const { result } = renderHook(() => useSaveFatigue(), { wrapper });

    act(() => {
      result.current.mutate({ muscleId: 'chest', value: 75 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // onError のロールバックにより元の値 30 に戻っているはず
    const cached = queryClient.getQueryData<CurrentFatigueMap>(['fatigue', 'current']);
    expect(cached?.chest.savedValue).toBe(30);
  });
});
