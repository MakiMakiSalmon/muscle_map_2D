import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FatiguePreview from '../FatiguePreview';
import ExerciseRow from '../ExerciseRow';
import type { Exercise, WorkoutExerciseInput } from '@/types/domain';

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

describe('FatiguePreview', () => {
  it('デルタ形式でプレビューを表示する', () => {
    const items = [
      {
        exercise: benchPress,
        input: { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null } as WorkoutExerciseInput,
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
        input: { exerciseId: 'bench_press', sets: 3, reps: 10, weightKg: null } as WorkoutExerciseInput,
      },
      {
        exercise: squat,
        input: { exerciseId: 'squat', sets: 3, reps: 10, weightKg: null } as WorkoutExerciseInput,
      },
    ];

    render(<FatiguePreview items={items} />);

    expect(screen.getByText(/太もも.*\+40%/)).toBeDefined();
  });

  it('種目が空のとき何も表示しない', () => {
    const { container } = render(<FatiguePreview items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ExerciseRow', () => {
  const defaultInput: WorkoutExerciseInput = {
    exerciseId: 'bench_press',
    sets: 3,
    reps: 10,
    weightKg: null,
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
