import { describe, it, expect } from 'vitest';
import {
  MUSCLE_GROUP_LABELS,
  MUSCLE_IDS,
  MUSCLE_LABELS,
  expandMuscleGroup,
} from '@/types/domain';

describe('MUSCLE_IDS', () => {
  it('16筋肉を含む', () => {
    expect(MUSCLE_IDS).toHaveLength(16);
  });

  it('中央4筋肉を含む', () => {
    expect(MUSCLE_IDS).toContain('head');
    expect(MUSCLE_IDS).toContain('chest');
    expect(MUSCLE_IDS).toContain('back');
    expect(MUSCLE_IDS).toContain('abs');
  });

  it('左右ペアを含む', () => {
    expect(MUSCLE_IDS).toContain('shoulders_left');
    expect(MUSCLE_IDS).toContain('shoulders_right');
    expect(MUSCLE_IDS).toContain('thighs_left');
    expect(MUSCLE_IDS).toContain('thighs_right');
  });
});

describe('expandMuscleGroup', () => {
  it('中央筋は単一要素を返す', () => {
    expect(expandMuscleGroup('head')).toEqual(['head']);
    expect(expandMuscleGroup('chest')).toEqual(['chest']);
    expect(expandMuscleGroup('back')).toEqual(['back']);
    expect(expandMuscleGroup('abs')).toEqual(['abs']);
  });

  it('左右ペア筋は2要素を返す', () => {
    expect(expandMuscleGroup('shoulders')).toEqual(['shoulders_left', 'shoulders_right']);
    expect(expandMuscleGroup('biceps')).toEqual(['biceps_left', 'biceps_right']);
    expect(expandMuscleGroup('triceps')).toEqual(['triceps_left', 'triceps_right']);
    expect(expandMuscleGroup('forearms')).toEqual(['forearms_left', 'forearms_right']);
    expect(expandMuscleGroup('thighs')).toEqual(['thighs_left', 'thighs_right']);
    expect(expandMuscleGroup('calves')).toEqual(['calves_left', 'calves_right']);
  });
});

describe('muscle labels', () => {
  it('head は首として表示する', () => {
    expect(MUSCLE_LABELS.head).toBe('首');
    expect(MUSCLE_GROUP_LABELS.head).toBe('首');
  });
});
