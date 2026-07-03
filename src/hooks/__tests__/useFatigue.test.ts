import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useUIStore } from '@/stores/uiStore';
import { useResetFatigue } from '../useFatigue';

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

describe('useResetFatigue', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('リセット失敗時に error Toast を追加する', async () => {
    server.use(
      http.put('/api/fatigue/reset', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useResetFatigue(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useUIStore.getState().toasts).toEqual([
      expect.objectContaining({
        type: 'error',
        message: '疲労値のリセットに失敗しました。時間をおいて再試行してください。',
      }),
    ]);
  });
});
