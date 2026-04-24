import { describe, it, expect } from 'vitest';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import type { Exercise } from '@/types/domain';

const benchPress: Exercise = {
  id: 'bench_press',
  nameJa: 'ベンチプレス',
  nameEn: 'bench_press',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['shoulders', 'triceps'],
};

const squat: Exercise = {
  id: 'squat',
  nameJa: 'スクワット',
  nameEn: 'squat',
  primaryMuscles: ['thighs'],
  secondaryMuscles: ['calves'],
};

describe('computeFatigueImpact', () => {
  it('ベースライン 3×10: primary=40, secondary=20', () => {
    const result = computeFatigueImpact(benchPress, 3, 10);
    expect(result.chest).toBe(40);
    expect(result.shoulders_left).toBe(20);
    expect(result.shoulders_right).toBe(20);
    expect(result.triceps_left).toBe(20);
    expect(result.triceps_right).toBe(20);
  });

  it('reps=null のとき 10 として扱う', () => {
    const result = computeFatigueImpact(benchPress, 3, null);
    expect(result.chest).toBe(40);
  });

  it('ボリューム倍増 6×10: primary=80(上限)', () => {
    const result = computeFatigueImpact(benchPress, 6, 10);
    expect(result.chest).toBe(80);
  });

  it('中央筋は単一IDに加算される', () => {
    const result = computeFatigueImpact(benchPress, 3, 10);
    expect(result.chest).toBe(40);
    const keys = Object.keys(result);
    expect(keys.some((k) => k.startsWith('chest_'))).toBe(false);
  });

  it('左右ペア筋は両方に加算される', () => {
    const result = computeFatigueImpact(squat, 3, 10);
    expect(result.thighs_left).toBe(40);
    expect(result.thighs_right).toBe(40);
    expect(result.calves_left).toBe(20);
    expect(result.calves_right).toBe(20);
  });

  it('primary と secondary が同じ筋肉の場合は合算される', () => {
    const exercise: Exercise = {
      id: 'test',
      nameJa: 'テスト',
      nameEn: 'test',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['chest'],
    };
    const result = computeFatigueImpact(exercise, 3, 10);
    expect(result.chest).toBe(60);
  });
});

describe('mergeImpacts', () => {
  it('空配列は空オブジェクトを返す', () => {
    expect(mergeImpacts([])).toEqual({});
  });

  it('単一のインパクトをそのまま返す', () => {
    const impact = computeFatigueImpact(benchPress, 3, 10);
    expect(mergeImpacts([impact])).toEqual(impact);
  });

  it('同じ筋肉のデルタが合算される', () => {
    const a = { chest: 40, shoulders_left: 20 };
    const b = { chest: 30, biceps_left: 15 };
    const result = mergeImpacts([a, b]);
    expect(result.chest).toBe(70);
    expect(result.shoulders_left).toBe(20);
    expect(result.biceps_left).toBe(15);
  });

  it('3種目のインパクトを合算できる', () => {
    const result = mergeImpacts([
      { chest: 40 },
      { chest: 40 },
      { chest: 40 },
    ]);
    expect(result.chest).toBe(120);
  });
});
