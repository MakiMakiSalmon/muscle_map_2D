import { describe, it, expect } from 'vitest';
import { getFatigueColor } from '@/lib/fatigue/colorMap';

describe('getFatigueColor', () => {
  it('0は灰色', () => {
    expect(getFatigueColor(0)).toBe('#dddddd');
  });

  it('1-29は薄緑', () => {
    expect(getFatigueColor(1)).toBe('#90ee90');
    expect(getFatigueColor(29)).toBe('#90ee90');
  });

  it('30-59は黄', () => {
    expect(getFatigueColor(30)).toBe('#ffd700');
    expect(getFatigueColor(59)).toBe('#ffd700');
  });

  it('60-79は橙', () => {
    expect(getFatigueColor(60)).toBe('#ff8c00');
    expect(getFatigueColor(79)).toBe('#ff8c00');
  });

  it('80-100は赤橙', () => {
    expect(getFatigueColor(80)).toBe('#ff4500');
    expect(getFatigueColor(100)).toBe('#ff4500');
  });
});
