'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useWorkoutHistory } from '@/hooks/useWorkout';
import { useUIStore } from '@/stores/uiStore';
import { formatJstDate, formatJstTime } from '@/lib/date/format';

export default function WorkoutTab() {
  const { data, isLoading } = useWorkoutHistory(5);
  const openWorkoutModal = useUIStore((s) => s.openWorkoutModal);

  return (
    <div className="space-y-4">
      <Button onClick={openWorkoutModal} className="w-full" size="sm">
        + 新しいトレーニングを記録する
      </Button>

      {isLoading && (
        <div className="text-sm text-gray-400">読み込み中...</div>
      )}

      {data?.sessions && data.sessions.length === 0 && (
        <div className="text-sm text-gray-400">記録がありません</div>
      )}

      {data?.sessions && data.sessions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600">直近のセッション</div>
          {data.sessions.map((session) => (
            <div
              key={session.id}
              className="p-3 bg-gray-50 rounded-lg text-sm space-y-1"
            >
              <div className="text-xs text-gray-400">
                {formatJstDate(session.performedAt)} {formatJstTime(session.performedAt)}
              </div>
              <div className="text-gray-700 truncate">
                {session.exercises.map((e) => e.exerciseId).join('、')}
              </div>
            </div>
          ))}
          <Link
            href="/workout/history"
            className="block text-sm text-blue-600 hover:text-blue-800 text-center pt-1"
          >
            すべて見る →
          </Link>
        </div>
      )}
    </div>
  );
}
