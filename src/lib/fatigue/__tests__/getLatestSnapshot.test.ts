import { describe, expect, it, vi } from 'vitest';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';
import type { FatigueSnapshot } from '@/types/domain';

function timestamp(date: Date) {
  return { toDate: () => date };
}

function makeDoc(
  id: string,
  recordedAt: Date,
  createdAt: Date,
  value: number,
) {
  return {
    id,
    data: () => ({
      muscleId: 'chest',
      value,
      recordedAt: timestamp(recordedAt),
      createdAt: timestamp(createdAt),
      source: 'manual',
      workoutSessionId: null,
    }),
  };
}

function createDb(docs: ReturnType<typeof makeDoc>[]) {
  const orderBy = vi.fn().mockReturnThis();
  const query = {
    where: vi.fn().mockReturnThis(),
    orderBy,
    limit: vi.fn().mockReturnThis(),
    get: vi.fn(async () => {
      const sorted = [...docs].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const recordedDiff = bData.recordedAt.toDate().getTime() - aData.recordedAt.toDate().getTime();
        if (recordedDiff !== 0) return recordedDiff;
        return bData.createdAt.toDate().getTime() - aData.createdAt.toDate().getTime();
      });
      return { empty: sorted.length === 0, docs: sorted.slice(0, 1) };
    }),
  };
  const db = {
    collection: vi.fn(() => query),
  };
  return { db, query, orderBy };
}

describe('getLatestSnapshot', () => {
  it('recordedAt DESC, createdAt DESC の 2 段ソートで最新を取得する', async () => {
    const recordedAt = new Date('2026-04-24T12:00:00.000Z');
    const olderCreatedAt = new Date('2026-04-24T12:00:01.000Z');
    const newerCreatedAt = new Date('2026-04-24T12:00:02.000Z');
    const { db, query, orderBy } = createDb([
      makeDoc('older', recordedAt, olderCreatedAt, 40),
      makeDoc('newer', recordedAt, newerCreatedAt, 60),
    ]);

    const result = await getLatestSnapshot('uid-1', 'chest', db as never);

    expect(query.where).toHaveBeenCalledWith('muscleId', '==', 'chest');
    expect(orderBy).toHaveBeenNthCalledWith(1, 'recordedAt', 'desc');
    expect(orderBy).toHaveBeenNthCalledWith(2, 'createdAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(result).toMatchObject<Partial<FatigueSnapshot>>({
      id: 'newer',
      muscleId: 'chest',
      value: 60,
      recordedAt,
      createdAt: newerCreatedAt,
      source: 'manual',
      workoutSessionId: null,
    });
  });

  it('スナップショットがない場合は null を返す', async () => {
    const { db } = createDb([]);

    await expect(getLatestSnapshot('uid-1', 'chest', db as never)).resolves.toBeNull();
  });
});
