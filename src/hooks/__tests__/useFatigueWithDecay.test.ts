import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useFatigueWithDecay } from '../useFatigueWithDecay';
import type { CurrentFatigueMap } from '@/types/domain';
import { MUSCLE_IDS } from '@/types/domain';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

function makeFatigueMap(savedValue: number, recordedAt: string): CurrentFatigueMap {
  return Object.fromEntries(
    MUSCLE_IDS.map((id) => [
      id,
      { savedValue, currentValue: savedValue, recordedAt, recoveryHoursRemaining: 0 },
    ]),
  ) as CurrentFatigueMap;
}

describe('useFatigueWithDecay', () => {
  it('データ未取得の間は null を返す', async () => {
    server.use(
      http.get('/api/fatigue/current', async () => {
        await new Promise(() => {}); // never resolves
      }),
    );
    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('全筋肉未記録 → savedValue=0 の場合 currentValue=0 を返す', async () => {
    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    for (const id of MUSCLE_IDS) {
      expect(result.current.data![id].currentValue).toBe(0);
    }
  });

  it('chest savedValue=80 を保存直後に取得 → currentValue ≈ 80', async () => {
    const now = new Date();
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json({ data: makeFatigueMap(80, now.toISOString()) }),
      ),
    );
    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    // 保存直後なので減衰はほぼゼロ（Math.round のずれで最大 1 の誤差を許容）
    expect(result.current.data!.chest.currentValue).toBeGreaterThanOrEqual(79);
    expect(result.current.data!.chest.currentValue).toBeLessThanOrEqual(80);
  });

  it('24時間前のスナップショット → currentValue が減衰した値になる（savedValue は保持）', async () => {
    // chest 回復時間 48h、24h 経過 → 50% 残存なので savedValue=48 → currentValue=24
    const recordedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json({ data: makeFatigueMap(48, recordedAt) }),
      ),
    );
    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.data!.chest.savedValue).toBe(48);
    expect(result.current.data!.chest.currentValue).toBe(24);
    expect(result.current.data!.chest.recoveryHoursRemaining).toBeGreaterThan(0);
  });

  it('current 取得が 500 の場合は isError=true と refetch を返す', async () => {
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isUnauthorized).toBe(false);
    expect(result.current.refetch).toEqual(expect.any(Function));
  });

  it('current 取得が 401 の場合は isUnauthorized=true を返す', async () => {
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isUnauthorized).toBe(true);
  });
});
