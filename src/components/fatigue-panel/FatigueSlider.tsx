'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { MuscleId } from '@/types/domain';

interface FatigueSliderProps {
  muscleId?: MuscleId; // used by parent as key prop only; not consumed internally
  initialValue: number;
  onSave: (value: number) => void;
  isSaving: boolean;
}

export default function FatigueSlider({
  initialValue,
  onSave,
  isSaving,
}: FatigueSliderProps) {
  const [draft, setDraft] = useState(initialValue);

  // Sync draft when the saved value externally changes (e.g. after successful save or muscle switch)
  // Use key prop on parent to remount when muscleId changes instead of tracking separately

  const getBarColor = (value: number): string => {
    if (value === 0) return '#dddddd';
    if (value < 30) return '#90ee90';
    if (value < 60) return '#ffd700';
    if (value < 80) return '#ff8c00';
    return '#ff4500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>疲労度</span>
        <span className="text-xl font-bold" style={{ color: getBarColor(draft) }}>
          {draft}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          accentColor: getBarColor(draft),
        }}
        aria-label={`疲労度スライダー ${draft}%`}
      />

      <div className="flex justify-between text-xs text-gray-400">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSave(draft)}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? '保存中...' : '確定'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft(0)}
          disabled={isSaving}
        >
          0にする
        </Button>
      </div>
    </div>
  );
}
