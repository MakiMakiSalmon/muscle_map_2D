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
    expect(result.current).toBeNull();
  });

  it('全筋肉未記録 → savedValue=0 の場合 currentValue=0 を返す', async () => {
    const { result } = renderHook(() => useFatigueWithDecay(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    for (const id of MUSCLE_IDS) {
      expect(result.current![id].currentValue).toBe(0);
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
    await waitFor(() => expect(result.current).not.toBeNull());
    // 保存直後なので減衰はほぼゼロ（Math.round のずれで最大 1 の誤差を許容）
    expect(result.current!.chest.currentValue).toBeGreaterThanOrEqual(79);
    expect(result.current!.chest.currentValue).toBeLessThanOrEqual(80);
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

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current!.chest.savedValue).toBe(48);
    expect(result.current!.chest.currentValue).toBe(24);
    expect(result.current!.chest.recoveryHoursRemaining).toBeGreaterThan(0);
  });
});
