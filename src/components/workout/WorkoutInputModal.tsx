'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ExerciseSearch from './ExerciseSearch';
import ExerciseRow from './ExerciseRow';
import FatiguePreview from './FatiguePreview';
import { useUIStore } from '@/stores/uiStore';
import { useWorkout } from '@/hooks/useWorkout';
import { toDatetimeLocalValue } from '@/lib/date/format';
import type { Exercise, WorkoutExerciseInput } from '@/types/domain';

interface RowItem {
  exercise: Exercise;
  input: WorkoutExerciseInput;
}

export default function WorkoutInputModal() {
  const { isWorkoutModalOpen, closeWorkoutModal } = useUIStore();
  const { mutate: saveWorkout, isPending } = useWorkout();

  const [rows, setRows] = useState<RowItem[]>([]);
  const [performedAt, setPerformedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [error, setError] = useState('');

  const handleClose = () => {
    if (isPending) return;
    setRows([]);
    setError('');
    closeWorkoutModal();
  };

  const handleAddExercise = (exercise: Exercise) => {
    setRows((prev) => [
      ...prev,
      {
        exercise,
        input: { exerciseId: exercise.id, sets: 3, reps: 10, weightKg: null },
      },
    ]);
  };

  const handleChangeRow = (index: number, updated: WorkoutExerciseInput) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, input: updated } : r)));
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (rows.length === 0) {
      setError('種目を1つ以上追加してください');
      return;
    }
    setError('');
    saveWorkout(
      {
        performedAt: new Date(performedAt).toISOString(),
        exercises: rows.map((r) => r.input),
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setError(err.message ?? '保存に失敗しました');
        },
      },
    );
  };

  return (
    <Modal isOpen={isWorkoutModalOpen} onClose={handleClose} title="トレーニング記録">
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {/* Date/time */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">実施日時</span>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        {/* Exercise search */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600">種目を追加</div>
          <ExerciseSearch onSelect={handleAddExercise} />
        </div>

        {/* Added exercises */}
        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <ExerciseRow
                key={`${row.exercise.id}-${i}`}
                exercise={row.exercise}
                input={row.input}
                onChange={(updated) => handleChangeRow(i, updated)}
                onRemove={() => handleRemoveRow(i)}
              />
            ))}
          </div>
        )}

        {/* Fatigue preview */}
        {rows.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <FatiguePreview items={rows} />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={handleClose} disabled={isPending} className="flex-1">
          キャンセル
        </Button>
        <Button onClick={handleSave} disabled={isPending || rows.length === 0} className="flex-1">
          {isPending ? '保存中...' : '保存して反映'}
        </Button>
      </div>
    </Modal>
  );
}
