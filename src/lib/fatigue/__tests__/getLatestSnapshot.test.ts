import { describe, expect, it, vi } from 'vitest';
import { getLatestSnapshot } from '@/lib/fatigue/getLatestSnapshot';
import type { FatigueSnapshot } from '@/types/domain';

function timestamp(date: Date) {
  return { toDate: () => date };
}

function makeDoc(
  id: string,
  recordedAt: Date,
  createdAt: Date | undefined,
  value: number,
) {
  return {
    id,
    data: () => ({
      muscleId: 'chest',
      value,
      recordedAt: timestamp(recordedAt),
      ...(createdAt ? { createdAt: timestamp(createdAt) } : {}),
      source: 'manual',
      workoutSessionId: null,
    }),
  };
}

function createDb(docs: ReturnType<typeof makeDoc>[]) {
  const queries: Array<{
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    orderBys: string[];
  }> = [];

  function makeQuery() {
    const orderBys: string[] = [];
    const query = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn((field: string) => {
        orderBys.push(field);
        return query;
      }),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn(async () => {
        const includesCreatedAtOrder = orderBys.includes('createdAt');
        const eligible = includesCreatedAtOrder
          ? docs.filter((doc) => doc.data().createdAt)
          : docs;
        const sorted = [...eligible].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const recordedDiff = bData.recordedAt.toDate().getTime() - aData.recordedAt.toDate().getTime();
          if (recordedDiff !== 0) return recordedDiff;
          const aCreatedAt = aData.createdAt?.toDate() ?? aData.recordedAt.toDate();
          const bCreatedAt = bData.createdAt?.toDate() ?? bData.recordedAt.toDate();
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        });
        return { empty: sorted.length === 0, docs: sorted.slice(0, 1) };
      }),
      orderBys,
    };
    queries.push(query);
    return query;
  }

  const db = {
    collection: vi.fn(() => ({
      where: vi.fn((...args: unknown[]) => makeQuery().where(...args)),
    })),
  };
  return { db, queries };
}

describe('getLatestSnapshot', () => {
  it('recordedAt DESC, createdAt DESC の 2 段ソートで最新を取得する', async () => {
    const recordedAt = new Date('2026-04-24T12:00:00.000Z');
    const olderCreatedAt = new Date('2026-04-24T12:00:01.000Z');
    const newerCreatedAt = new Date('2026-04-24T12:00:02.000Z');
    const { db, queries } = createDb([
      makeDoc('older', recordedAt, olderCreatedAt, 40),
      makeDoc('newer', recordedAt, newerCreatedAt, 60),
    ]);

    const result = await getLatestSnapshot('uid-1', 'chest', db as never);

    expect(queries[0].where).toHaveBeenCalledWith('muscleId', '==', 'chest');
    expect(queries[0].orderBy).toHaveBeenNthCalledWith(1, 'recordedAt', 'desc');
    expect(queries[0].orderBy).toHaveBeenNthCalledWith(2, 'createdAt', 'desc');
    expect(queries[0].limit).toHaveBeenCalledWith(1);
    expect(queries[1].orderBy).toHaveBeenNthCalledWith(1, 'recordedAt', 'desc');
    expect(queries[1].limit).toHaveBeenCalledWith(1);
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

  it('createdAt がない旧スナップショットも最新候補に含める', async () => {
    const oldRecordedAt = new Date('2026-04-24T12:00:00.000Z');
    const newRecordedAt = new Date('2026-04-24T13:00:00.000Z');
    const { db } = createDb([
      makeDoc('created', oldRecordedAt, new Date('2026-04-24T12:00:10.000Z'), 40),
      makeDoc('legacy', newRecordedAt, undefined, 60),
    ]);

    const result = await getLatestSnapshot('uid-1', 'chest', db as never);

    expect(result).toMatchObject<Partial<FatigueSnapshot>>({
      id: 'legacy',
      value: 60,
      recordedAt: newRecordedAt,
      createdAt: newRecordedAt,
    });
  });

  it('スナップショットがない場合は null を返す', async () => {
    const { db } = createDb([]);

    await expect(getLatestSnapshot('uid-1', 'chest', db as never)).resolves.toBeNull();
  });
});
