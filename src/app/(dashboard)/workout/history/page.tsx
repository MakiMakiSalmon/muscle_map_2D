'use client';

import Link from 'next/link';
import { useWorkoutHistory } from '@/hooks/useWorkout';
import { useAllExercises } from '@/hooks/useExercises';
import { formatJstDate, formatJstTime } from '@/lib/date/format';
import { collapseToGroups } from '@/lib/workout/collapseToGroups';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import { MUSCLE_GROUP_LABELS } from '@/types/domain';
import type { MuscleGroup, WorkoutSession, Exercise } from '@/types/domain';

function SessionCard({
  session,
  exerciseMap,
}: {
  session: WorkoutSession;
  exerciseMap: Map<string, Exercise>;
}) {
  const impacts =
    session.fatigueImpacts ??
    mergeImpacts(
      session.exercises.map((ex) => {
        const exercise = exerciseMap.get(ex.exerciseId);
        if (!exercise) return {};
        return computeFatigueImpact(exercise, ex.sets, ex.reps);
      }),
    );
  const grouped = collapseToGroups(impacts);
  const impactEntries = Object.entries(grouped) as [MuscleGroup, number][];

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{formatJstTime(session.performedAt)}</span>
      </div>

      <div className="text-sm text-gray-800">
        {session.exercises.map((ex, i) => {
          const exercise = exerciseMap.get(ex.exerciseId);
          return (
            <span key={i}>
              {i > 0 && ' / '}
              {exercise?.nameJa ?? ex.exerciseId}
              {' '}
              {ex.sets}×{ex.reps ?? '?'}
              {ex.weightKg != null && ` ${ex.weightKg}kg`}
            </span>
          );
        })}
      </div>

      {impactEntries.length > 0 && (
        <div className="text-xs text-gray-500">
          影響:{' '}
          {impactEntries.map(([group, delta], i) => (
            <span key={group}>
              {i > 0 && ', '}
              {MUSCLE_GROUP_LABELS[group]}+{delta}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { data, isLoading } = useWorkoutHistory(30);
  const { data: exercises = [] } = useAllExercises();

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  // Group sessions by JST date
  const grouped = new Map<string, WorkoutSession[]>();
  for (const session of data?.sessions ?? []) {
    const date = formatJstDate(session.performedAt);
    const existing = grouped.get(date) ?? [];
    grouped.set(date, [...existing, session]);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← 戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-900">トレーニング履歴</h1>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400">読み込み中...</div>
      )}

      {!isLoading && grouped.size === 0 && (
        <div className="text-sm text-gray-400">記録がありません</div>
      )}

      {Array.from(grouped.entries()).map(([date, sessions]) => (
        <div key={date} className="space-y-2">
          <div className="text-sm font-semibold text-gray-500 border-b border-gray-100 pb-1">
            {date}
          </div>
          {sessions.map((session: WorkoutSession) => (
            <SessionCard key={session.id} session={session} exerciseMap={exerciseMap} />
          ))}
        </div>
      ))}
    </div>
  );
}
