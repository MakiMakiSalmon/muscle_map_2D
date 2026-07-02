import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { TZ, toDatetimeLocalValue } from '../format';

describe('toDatetimeLocalValue', () => {
  it('runtime のローカルタイムゾーンに依存せず JST の datetime-local 値を組み立てる', () => {
    const utcDate = new Date('2026-07-02T03:34:56.789Z');
    const value = toDatetimeLocalValue(utcDate);

    expect(value).toBe('2026-07-02T12:34');
    expect(fromZonedTime(value, TZ).toISOString()).toBe('2026-07-02T03:34:00.000Z');
  });

  it('秒とミリ秒を datetime-local 値に含めない', () => {
    const date = new Date('2026-01-01T18:04:05.678Z');

    expect(toDatetimeLocalValue(date)).toBe('2026-01-02T03:04');
  });
});
