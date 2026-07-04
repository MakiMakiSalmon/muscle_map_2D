import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server } from '@/test/mocks/server';
import { useUIStore } from '@/stores/uiStore';
import FatiguePreview from '../FatiguePreview';
import ExerciseRow from '../ExerciseRow';
import WorkoutInputModal from '../WorkoutInputModal';
import type { Exercise, WorkoutExerciseInput } from '@/types/domain';

vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  },
  clientDb: {},
}));

const benchPress: Exercise = {
  id: 'bench_press',
  nameJa: 'ベンチプレス',
  nameEn: 'bench_press',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders'],
};

const squat: Exercise = {
  id: 'squat',
  nameJa: 'スクワット',
  nameEn: 'squat',
  primaryMuscles: ['thighs'],
  secondaryMuscles: ['calves', 'abs'],
};

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

beforeEach(() => {
  useUIStore.setState({ isWorkoutModalOpen: false });
});

describe('FatiguePreview', () => {
  it('デルタ形式でプレビューを表示する', () => {
    const items = [
      {
        exercise: benchPress,
        input: { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null, rpe: null },
      },
    ];

    render(<FatiguePreview items={items} />);

    // 3sets × 10reps = baseVolume → primaryDelta=40%, secondaryDelta=20%
    expect(screen.getByText(/胸部.*\+40%/)).toBeDefined();
    expect(screen.getByText(/三頭筋.*\+40%/)).toBeDefined();
    expect(screen.getByText(/肩.*\+20%/)).toBeDefined();
  });

  it('複数種目のデルタを合算して表示する', () => {
    const items = [
      {
        exercise: benchPress,
        input: { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null, rpe: null },
      },
      {
        exercise: squat,
        input: { exerciseId: 'squat', sets: 3, reps: 10, weightKg: null, rpe: null },
      },
    ];

    render(<FatiguePreview items={items} />);

    expect(screen.getByText(/太もも.*\+40%/)).toBeDefined();
  });

  it('種目が空のとき何も表示しない', () => {
    const { container } = render(<FatiguePreview items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('RPE 込みでプレビューを再計算する', () => {
    const items = [
      {
        exercise: benchPress,
        input: { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null, rpe: 10 },
      },
    ];

    render(<FatiguePreview items={items} />);

    expect(screen.getByText(/胸部.*\+48%/)).toBeDefined();
    expect(screen.getByText(/肩.*\+24%/)).toBeDefined();
  });
});

describe('WorkoutInputModal', () => {
  it('datetime-local 入力値を Asia/Tokyo として UTC ISO に変換して保存する', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;

    server.use(
      http.get('/api/exercises', () =>
        HttpResponse.json({ exercises: [benchPress] }),
      ),
      http.post('/api/workout', async ({ request }) => {
        requestBody = await request.json();
        const performedAt =
          typeof requestBody === 'object' &&
          requestBody !== null &&
          'performedAt' in requestBody &&
          typeof requestBody.performedAt === 'string'
            ? requestBody.performedAt
            : '';

        return HttpResponse.json(
          {
            session: { id: 'session1', performedAt, exercises: [] },
            fatigueImpacts: {},
          },
          { status: 201 },
        );
      }),
    );

    useUIStore.setState({ isWorkoutModalOpen: true });
    renderWithQueryClient(<WorkoutInputModal />);

    fireEvent.change(screen.getByLabelText('実施日時'), {
      target: { value: '2026-07-02T12:34' },
    });
    await user.type(screen.getByPlaceholderText('種目を検索...'), 'bench');
    await user.click(await screen.findByRole('button', { name: /ベンチプレス/ }));
    await user.click(screen.getByRole('button', { name: '保存して反映' }));

    await waitFor(() =>
      expect(requestBody).toEqual(
        expect.objectContaining({
          performedAt: '2026-07-02T03:34:00.000Z',
          exercises: [
            expect.objectContaining({
              exerciseId: 'bench_press',
              sets: 3,
              reps: 10,
              weightKg: null,
              rpe: null,
            }),
          ],
        }),
      ),
    );
  });
});

describe('ExerciseRow', () => {
  const defaultInput: WorkoutExerciseInput = {
    exerciseId: 'bench_press',
    sets: 3,
    reps: 10,
    weightKg: null,
    rpe: null,
  };

  it('種目名を表示する', () => {
    render(
      <ExerciseRow
        exercise={benchPress}
        input={defaultInput}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('ベンチプレス')).toBeDefined();
  });

  it('RPE セレクトで onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ExerciseRow
        exercise={benchPress}
        input={defaultInput}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('RPE'), '10');
    expect(onChange).toHaveBeenCalledWith({ ...defaultInput, rpe: 10 });
  });

  it('削除ボタンで onRemove が呼ばれる', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <ExerciseRow
        exercise={benchPress}
        input={defaultInput}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ベンチプレスを削除/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
