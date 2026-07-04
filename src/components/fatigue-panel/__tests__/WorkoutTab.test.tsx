import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server } from '@/test/mocks/server';
import WorkoutTab from '../WorkoutTab';
import type { Exercise } from '@/types/domain';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

const exercises: Exercise[] = Array.from({ length: 25 }, (_, index) => {
  const n = index + 1;
  return {
    id: `exercise_${n}`,
    nameJa: `種目${n}`,
    nameEn: `exercise_${n}`,
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
  };
});

describe('WorkoutTab', () => {
  it('21件以上の全件キャッシュで直近セッションの種目名を解決する', async () => {
    let exercisesRequestUrl = '';

    server.use(
      http.get('/api/exercises', ({ request }) => {
        const url = new URL(request.url);
        exercisesRequestUrl = url.toString();
        const isOldLimitedRequest =
          !url.searchParams.has('q') && url.searchParams.get('limit') === '20';

        return HttpResponse.json({
          exercises: isOldLimitedRequest ? exercises.slice(0, 20) : exercises,
        });
      }),
      http.get('/api/workout/history', () =>
        HttpResponse.json({
          sessions: [
            {
              id: 'session1',
              performedAt: '2026-07-02T03:34:00.000Z',
              exercises: [
                {
                  exerciseId: 'exercise_25',
                  sets: 3,
                  reps: 10,
                  weightKg: null,
                  rpe: null,
                },
              ],
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    renderWithQueryClient(<WorkoutTab />);

    expect(await screen.findByText('種目25')).toBeInTheDocument();
    expect(new URL(exercisesRequestUrl).searchParams.get('limit')).toBeNull();
  });
});
