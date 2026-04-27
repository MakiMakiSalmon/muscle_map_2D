'use client';

import { MUSCLE_LABELS } from '@/types/domain';
import type { MuscleId } from '@/types/domain';

interface MuscleLayerProps {
  muscleId: MuscleId;
  currentValue: number;
  isSelected: boolean;
  onClick: () => void;
  pathData: string;
  fillColor: string;
}

export default function MuscleLayer({
  muscleId,
  currentValue,
  isSelected,
  onClick,
  pathData,
  fillColor,
}: MuscleLayerProps) {
  return (
    <path
      d={pathData}
      fill={fillColor}
      stroke={isSelected ? '#1d4ed8' : '#6b7280'}
      strokeWidth={isSelected ? 2 : 0.8}
      opacity={0.85}
      className="cursor-pointer transition-opacity hover:opacity-100"
      onClick={onClick}
      role="button"
      aria-label={`${MUSCLE_LABELS[muscleId]} ${currentValue}%`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <title>{`${MUSCLE_LABELS[muscleId]} ${currentValue}%`}</title>
    </path>
  );
}
