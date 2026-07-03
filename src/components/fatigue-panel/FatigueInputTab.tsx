'use client';

import { useState } from 'react';
import FatigueSlider from './FatigueSlider';
import FatigueHistoryChart from './FatigueHistoryChart';
import { useSaveFatigue } from '@/hooks/useSaveFatigue';
import { useFatigueHistory } from '@/hooks/useFatigue';
import { MUSCLE_LABELS } from '@/types/domain';
import type { CurrentFatigueEntry, MuscleId } from '@/types/domain';

interface FatigueInputTabProps {
  muscleId: MuscleId;
  entry: CurrentFatigueEntry;
}

export default function FatigueInputTab({ muscleId, entry }: FatigueInputTabProps) {
  const { mutate: save, isPending } = useSaveFatigue();
  const { data: history = [] } = useFatigueHistory(muscleId, 20);
  const [saveVersion, setSaveVersion] = useState(0);

  const formatRecovery = (hours: number): string => {
    if (hours <= 0) return '回復済み';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `あと ${h}h ${m}m` : `あと ${h}h`;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="text-base font-semibold text-gray-900">
          {MUSCLE_LABELS[muscleId]}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>現在値: <span className="font-medium text-gray-800">{entry.currentValue}%</span></span>
          <span>{formatRecovery(entry.recoveryHoursRemaining)}</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <FatigueSlider
          key={`${muscleId}-${saveVersion}`}
          muscleId={muscleId}
          initialValue={entry.currentValue}
          onSave={(value) =>
            save(
              { muscleId, value },
              { onSuccess: () => setSaveVersion((version) => version + 1) },
            )
          }
          isSaving={isPending}
        />
      </div>

      {history.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="text-sm font-medium text-gray-600">疲労履歴</div>
          <FatigueHistoryChart history={history} muscleId={muscleId} />
        </div>
      )}
    </div>
  );
}
