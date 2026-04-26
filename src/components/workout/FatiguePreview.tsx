'use client';

import { computeFatigueImpact, mergeImpacts } from '@/lib/workout/fatigueImpact';
import { collapseToGroups } from '@/lib/workout/collapseToGroups';
import type { Exercise, MuscleGroup, WorkoutExerciseInput } from '@/types/domain';

const GROUP_LABELS: Record<MuscleGroup, string> = {
  head: '頭部',
  chest: '胸部',
  back: '背中',
  abs: '腹部',
  shoulders: '肩',
  biceps: '二頭筋',
  triceps: '三頭筋',
  forearms: '前腕',
  thighs: '太もも',
  calves: 'ふくらはぎ',
};

interface FatiguePreviewProps {
  items: { exercise: Exercise; input: WorkoutExerciseInput }[];
}

export default function FatiguePreview({ items }: FatiguePreviewProps) {
  if (items.length === 0) return null;

  const impacts = mergeImpacts(
    items.map(({ exercise, input }) =>
      computeFatigueImpact(exercise, input.sets, input.reps),
    ),
  );

  const grouped = collapseToGroups(impacts);
  const entries = Object.entries(grouped) as [MuscleGroup, number][];

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-gray-600">疲労値プレビュー</div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([group, delta]) => (
          <span
            key={group}
            className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-sm font-medium"
          >
            {GROUP_LABELS[group]}: +{delta}%
          </span>
        ))}
      </div>
    </div>
  );
}
