'use client';

import MuscleLayer from './MuscleLayer';
import { MUSCLE_SVG_PATHS } from '@/lib/fatigue/muscleSvgPaths';
import { getFatigueColor } from '@/lib/fatigue/colorMap';
import type { CurrentFatigueMap, MuscleId } from '@/types/domain';

interface MuscleDiagramProps {
  fatigueData: CurrentFatigueMap;
  selectedMuscle: MuscleId | null;
  onMuscleClick: (id: MuscleId) => void;
  view: 'front' | 'back';
}

export default function MuscleDiagram({
  fatigueData,
  selectedMuscle,
  onMuscleClick,
  view,
}: MuscleDiagramProps) {
  const paths = MUSCLE_SVG_PATHS.filter((p) => p.view === view);

  return (
    <svg
      viewBox="0 0 200 420"
      className="w-full max-w-[220px] select-none"
      aria-label={`筋肉図（${view === 'front' ? '前面' : '背面'}）`}
    >
      {/* Body silhouette background */}
      <g opacity={0.08}>
        {/* Torso */}
        <path d="M 30,72 L 170,72 L 145,198 L 55,198 Z" fill="#374151" />
        {/* Left arm */}
        <path d="M 18,72 L 58,72 L 50,222 L 6,222 Z" fill="#374151" />
        {/* Right arm */}
        <path d="M 142,72 L 182,72 L 194,222 L 150,222 Z" fill="#374151" />
        {/* Left leg */}
        <path d="M 55,198 L 100,196 L 100,382 L 55,382 Z" fill="#374151" />
        {/* Right leg */}
        <path d="M 100,196 L 145,198 L 145,382 L 100,382 Z" fill="#374151" />
        {/* Head */}
        <circle cx="100" cy="38" r="27" fill="#374151" />
      </g>

      {/* Muscle regions */}
      {paths.map((entry) => {
        const currentValue = fatigueData[entry.muscleId]?.currentValue ?? 0;
        return (
          <MuscleLayer
            key={`${entry.muscleId}-${entry.view}`}
            muscleId={entry.muscleId}
            currentValue={currentValue}
            isSelected={selectedMuscle === entry.muscleId}
            onClick={() => onMuscleClick(entry.muscleId)}
            pathData={entry.pathData}
            fillColor={getFatigueColor(currentValue)}
          />
        );
      })}
    </svg>
  );
}
