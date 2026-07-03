import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import DashboardPage from '../page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/components/body-diagram/MuscleDiagram', () => ({
  default: () => <div data-testid="muscle-diagram" />,
}));

vi.mock('@/components/fatigue-panel/FatiguePanel', () => ({
  default: () => <div data-testid="fatigue-panel" />,
}));

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

function renderDashboardPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage error feedback', () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it('current 取得 500 で再試行 UI を表示し、再試行で再取得する', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/fatigue/current', () => {
        requestCount += 1;
        return HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR' },
          { status: 500 },
        );
      }),
    );

    const user = userEvent.setup();
    renderDashboardPage();

    expect(await screen.findByText('疲労データを取得できませんでした。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));

    await waitFor(() => expect(requestCount).toBeGreaterThanOrEqual(2));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('current 取得 401 でログイン誘導ボタンを表示する', async () => {
    server.use(
      http.get('/api/fatigue/current', () =>
        HttpResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderDashboardPage();

    await screen.findByText('疲労データを取得できませんでした。');
    await user.click(screen.getByRole('button', { name: 'ログインへ移動' }));

    expect(replaceMock).toHaveBeenCalledWith('/login');
  });
});
