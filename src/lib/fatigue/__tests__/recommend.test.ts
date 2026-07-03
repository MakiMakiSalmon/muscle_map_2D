import { describe, expect, it } from 'vitest';
import { getRecommendedGroups } from '@/lib/fatigue/recommend';
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

describe('getRecommendedGroups', () => {
  it('currentValue が 29 のグループを返し、30 は返さない', () => {
    const map = makeFatigueMap({
      chest: 29,
      back: 30,
    });

    expect(getRecommendedGroups(map)).toContain('chest');
    expect(getRecommendedGroups(map)).not.toContain('back');
  });

  it('左右ペアは max が閾値未満のときだけ返す', () => {
    const map = makeFatigueMap({
      shoulders_left: 20,
      shoulders_right: 31,
      biceps_left: 29,
      biceps_right: 10,
    });

    const result = getRecommendedGroups(map);
    expect(result).not.toContain('shoulders');
    expect(result).toContain('biceps');
  });

  it('回復済みグループが 0 件なら空配列を返す', () => {
    expect(getRecommendedGroups(makeFatigueMap({}))).toEqual([]);
  });
});
