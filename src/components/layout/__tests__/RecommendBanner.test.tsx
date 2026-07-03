import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendBanner from '@/components/layout/RecommendBanner';
import { MUSCLE_IDS } from '@/types/domain';
import type { CurrentFatigueMap, MuscleId } from '@/types/domain';

function makeFatigueMap(
  values: Partial<Record<MuscleId, number>>,
): CurrentFatigueMap {
  return Object.fromEntries(
    MUSCLE_IDS.map((id) => [
      id,
      {
        savedValue: values[id] ?? 100,
        currentValue: values[id] ?? 100,
        recordedAt: '2026-07-03T00:00:00.000Z',
        recoveryHoursRemaining: 0,
      },
    ]),
  ) as CurrentFatigueMap;
}

describe('RecommendBanner', () => {
  it('回復済みグループをバッジ表示する', () => {
    render(
      <RecommendBanner
        fatigueData={makeFatigueMap({ chest: 12 })}
        onSelectMuscle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '胸部' })).toBeInTheDocument();
    expect(screen.queryByText('今日は休養日 💤')).not.toBeInTheDocument();
  });

  it('バッジクリックで該当筋肉を選択する。ペア筋は左を選ぶ', async () => {
    const user = userEvent.setup();
    const onSelectMuscle = vi.fn();

    render(
      <RecommendBanner
        fatigueData={makeFatigueMap({
          shoulders_left: 20,
          shoulders_right: 10,
        })}
        onSelectMuscle={onSelectMuscle}
      />,
    );

    await user.click(screen.getByRole('button', { name: '肩' }));

    expect(onSelectMuscle).toHaveBeenCalledWith('shoulders_left');
  });

  it('回復済みグループが 0 件なら休養日を表示する', () => {
    render(
      <RecommendBanner fatigueData={makeFatigueMap({})} onSelectMuscle={vi.fn()} />,
    );

    expect(screen.getByText('今日は休養日 💤')).toBeInTheDocument();
  });
});
