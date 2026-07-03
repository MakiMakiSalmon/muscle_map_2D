import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryPage from '../page';
import type { Exercise, WorkoutSession } from '@/types/domain';

const { mockUseWorkoutHistory, mockUseExercises, mockUseDeleteWorkout } = vi.hoisted(() => ({
  mockUseWorkoutHistory: vi.fn(),
  mockUseExercises: vi.fn(),
  mockUseDeleteWorkout: vi.fn(),
}));

vi.mock('@/hooks/useWorkout', () => ({
  useWorkoutHistory: () => mockUseWorkoutHistory(),
}));

vi.mock('@/hooks/useExercises', () => ({
  useAllExercises: () => mockUseExercises(),
}));

vi.mock('@/hooks/useDeleteWorkout', () => ({
  useDeleteWorkout: () => mockUseDeleteWorkout(),
  DeleteWorkoutError: class DeleteWorkoutError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

const benchPress: Exercise = {
  id: 'bench_press',
  nameJa: 'ベンチプレス',
  nameEn: 'bench_press',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders'],
};

function makeSession(fatigueImpacts?: WorkoutSession['fatigueImpacts']): WorkoutSession {
  return {
    id: 'session1',
    performedAt: '2026-04-01T10:00:00.000Z',
    exercises: [{ exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: 60, rpe: null }],
    ...(fatigueImpacts !== undefined ? { fatigueImpacts } : {}),
  };
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExercises.mockReturnValue({ data: [benchPress] });
    mockUseDeleteWorkout.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('fatigueImpacts がある場合は保存済みの影響値を表示する', () => {
    mockUseWorkoutHistory.mockReturnValue({
      data: { sessions: [makeSession({ chest: 12 })], nextCursor: null },
      isLoading: false,
    });

    render(<HistoryPage />);

    expect(screen.getByText('胸部+12%')).toBeInTheDocument();
    expect(screen.queryByText('胸部+40%')).not.toBeInTheDocument();
  });

  it('fatigueImpacts がない旧セッションはクライアント側で再計算する', () => {
    mockUseWorkoutHistory.mockReturnValue({
      data: { sessions: [makeSession()], nextCursor: null },
      isLoading: false,
    });

    render(<HistoryPage />);

    expect(screen.getByText('胸部+40%')).toBeInTheDocument();
  });
});
