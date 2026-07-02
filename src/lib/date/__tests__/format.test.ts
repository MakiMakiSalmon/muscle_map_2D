import { describe, expect, it } from 'vitest';
import { toDatetimeLocalValue } from '../format';

describe('toDatetimeLocalValue', () => {
  it('TZ=Asia/Tokyo の Vitest 実行環境で datetime-local 初期値を JST 現在時刻として組み立てる', () => {
    expect(process.env.TZ).toBe('Asia/Tokyo');

    const utcDate = new Date('2026-07-02T03:34:56.789Z');
    const value = toDatetimeLocalValue(utcDate);

    expect(value).toBe('2026-07-02T12:34');
    expect(new Date(value).toISOString()).toBe('2026-07-02T03:34:00.000Z');
  });

  it('秒とミリ秒を datetime-local 値に含めない', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5, 678);

    expect(toDatetimeLocalValue(date)).toBe('2026-01-02T03:04');
  });
});
