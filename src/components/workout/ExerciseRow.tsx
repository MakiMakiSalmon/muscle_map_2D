'use client';

import type { Exercise, WorkoutExerciseInput } from '@/types/domain';

interface ExerciseRowProps {
  exercise: Exercise;
  input: WorkoutExerciseInput;
  onChange: (updated: WorkoutExerciseInput) => void;
  onRemove: () => void;
}

export default function ExerciseRow({ exercise, input, onChange, onRemove }: ExerciseRowProps) {
  const numberInput = (
    value: number | null,
    onUpdate: (v: number | null) => void,
    label: string,
    placeholder: string,
  ) => (
    <label className="flex flex-col gap-0.5 flex-1">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="number"
        min={0}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value === '' ? null : Number(e.target.value);
          onUpdate(v);
        }}
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </label>
  );

  return (
    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{exercise.nameJa}</span>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors text-xs"
          aria-label={`${exercise.nameJa}を削除`}
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2">
        {numberInput(
          input.sets,
          (v) => onChange({ ...input, sets: v ?? 1 }),
          'セット',
          '3',
        )}
        {numberInput(
          input.reps,
          (v) => onChange({ ...input, reps: v }),
          '回数',
          '10',
        )}
        {numberInput(
          input.weightKg,
          (v) => onChange({ ...input, weightKg: v }),
          '重量(kg)',
          '60',
        )}
      </div>

      <div className="text-xs text-gray-400">
        主: {exercise.primaryMuscles.join('、')}
        {exercise.secondaryMuscles.length > 0 && (
          <span> ／ 補助: {exercise.secondaryMuscles.join('、')}</span>
        )}
      </div>
    </div>
  );
}
