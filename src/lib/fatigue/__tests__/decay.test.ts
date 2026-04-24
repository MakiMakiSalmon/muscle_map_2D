import { describe, it, expect } from 'vitest';
import { applyDecay, calcRecoveryHoursRemaining } from '@/lib/fatigue/decay';

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600 * 1000);
}

describe('applyDecay', () => {
  it('経過時間0なら保存値をそのまま返す', () => {
    const now = new Date();
    expect(applyDecay(80, now, 'chest', now)).toBe(80);
  });

  it('chest(48h): 24h後は約50%', () => {
    const result = applyDecay(80, hoursAgo(24), 'chest');
    expect(result).toBe(40);
  });

  it('chest(48h): 48h後は0', () => {
    const result = applyDecay(80, hoursAgo(48), 'chest');
    expect(result).toBe(0);
  });

  it('完全回復後(96h後)は0', () => {
    const result = applyDecay(80, hoursAgo(96), 'chest');
    expect(result).toBe(0);
  });

  it('savedValue=0 は常に0', () => {
    expect(applyDecay(0, hoursAgo(1), 'chest')).toBe(0);
    expect(applyDecay(0, hoursAgo(100), 'back')).toBe(0);
  });

  it('back(72h): 36h後は約50%', () => {
    const result = applyDecay(100, hoursAgo(36), 'back');
    expect(result).toBe(50);
  });

  it('Math.round が適用される', () => {
    // chest 48h, savedValue=100, elapsed=1h => 100*(1-1/48) = 97.916... → 98
    const result = applyDecay(100, hoursAgo(1), 'chest');
    expect(result).toBe(98);
  });
});

describe('calcRecoveryHoursRemaining', () => {
  it('savedValue=0 は0を返す', () => {
    expect(calcRecoveryHoursRemaining(0, hoursAgo(10), 'chest')).toBe(0);
  });

  it('経過時間0の場合、recoveryHoursをそのまま返す', () => {
    const now = new Date();
    expect(calcRecoveryHoursRemaining(80, now, 'chest', now)).toBe(48);
  });

  it('chest(48h): 24h経過後は24h残り', () => {
    const result = calcRecoveryHoursRemaining(80, hoursAgo(24), 'chest');
    expect(result).toBe(24);
  });

  it('完全回復後は0を返す', () => {
    const result = calcRecoveryHoursRemaining(80, hoursAgo(48), 'chest');
    expect(result).toBe(0);
  });

  it('小数点1桁に丸められる', () => {
    // chest 48h, elapsed=0.95h => remaining=47.05 => round(47.05*10)/10 = 47.1
    const recordedAt = new Date(Date.now() - 0.95 * 3600 * 1000);
    const result = calcRecoveryHoursRemaining(80, recordedAt, 'chest');
    expect(result).toBe(47.1);
  });
});
