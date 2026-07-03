'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWorkoutHistory } from '@/hooks/useWorkout';
import { DeleteWorkoutError, useDeleteWorkout } from '@/hooks/useDeleteWorkout';
import { useAllExercises } from '@/hooks/useExercises';
import { formatJstDate, formatJstTime } from '@/lib/date/format';
import { collapseToGroups } from '@/lib/workout/collapseToGroups';
import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import { MUSCLE_GROUP_LABELS } from '@/types/domain';
import type { MuscleGroup, WorkoutSession, Exercise } from '@/types/domain';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

function SessionCard({
  session,
  exerciseMap,
  onDelete,
}: {
  session: WorkoutSession;
  exerciseMap: Map<string, Exercise>;
  onDelete: (session: WorkoutSession) => void;
}) {
  const impacts =
    session.fatigueImpacts ??
    mergeImpacts(
      session.exercises.map((ex) => {
        const exercise = exerciseMap.get(ex.exerciseId);
        if (!exercise) return {};
        return computeFatigueImpact(exercise, ex.sets, ex.reps, ex.rpe);
      }),
    );
  const grouped = collapseToGroups(impacts);
  const impactEntries = Object.entries(grouped) as [MuscleGroup, number][];

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
        <span>{formatJstTime(session.performedAt)}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => onDelete(session)}
        >
          削除
        </Button>
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
  const deleteWorkout = useDeleteWorkout();
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  // Group sessions by JST date
  const grouped = new Map<string, WorkoutSession[]>();
  for (const session of data?.sessions ?? []) {
    const date = formatJstDate(session.performedAt);
    const existing = grouped.get(date) ?? [];
    grouped.set(date, [...existing, session]);
  }

  const closeDeleteModal = () => {
    if (deleteWorkout.isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteWorkout.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
      onError: (err) => {
        if (err instanceof DeleteWorkoutError && err.code === 'HAS_NEWER_SNAPSHOT') {
          setDeleteError('この記録より新しい記録があるため削除できません。手動調整または全リセットをご利用ください。');
          return;
        }
        setDeleteError('削除に失敗しました。時間をおいて再試行してください。');
      },
    });
  };

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
            <SessionCard
              key={session.id}
              session={session}
              exerciseMap={exerciseMap}
              onDelete={(target) => {
                setDeleteTarget(target);
                setDeleteError(null);
              }}
            />
          ))}
        </div>
      ))}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="トレーニング記録を削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            このトレーニング記録を削除します。削除すると履歴から消え、影響した筋肉の現在値は直前の状態に戻ります。
          </p>

          {deleteTarget && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{formatJstDate(deleteTarget.performedAt)} {formatJstTime(deleteTarget.performedAt)}</div>
              <div className="mt-1">
                {deleteTarget.exercises.map((ex, i) => {
                  const exercise = exerciseMap.get(ex.exerciseId);
                  return (
                    <span key={i}>
                      {i > 0 && ' / '}
                      {exercise?.nameJa ?? ex.exerciseId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={deleteWorkout.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteWorkout.isPending}
            >
              {deleteWorkout.isPending ? '削除中...' : '削除'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
