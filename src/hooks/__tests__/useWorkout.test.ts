import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useUIStore } from '@/stores/uiStore';
import { useWorkout } from '../useWorkout';

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
  return Wrapper;
}

describe('useWorkout', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('ワークアウト保存失敗時に error Toast を追加する', async () => {
    server.use(
      http.post('/api/workout', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useWorkout(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        performedAt: new Date().toISOString(),
        exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: 60 }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useUIStore.getState().toasts).toEqual([
      expect.objectContaining({
        type: 'error',
        message: 'トレーニング記録の保存に失敗しました。入力内容を確認して再試行してください。',
      }),
    ]);
  });
});
