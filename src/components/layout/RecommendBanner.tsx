'use client';

import { getRecommendedGroups } from '@/lib/fatigue/recommend';
import { MUSCLE_GROUP_LABELS, expandMuscleGroup } from '@/types/domain';
import type { CurrentFatigueMap, MuscleGroup, MuscleId } from '@/types/domain';

interface RecommendBannerProps {
  fatigueData: CurrentFatigueMap | null;
  onSelectMuscle: (muscleId: MuscleId) => void;
}

export default function RecommendBanner({
  fatigueData,
  onSelectMuscle,
}: RecommendBannerProps) {
  if (!fatigueData) {
    return (
      <section className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      </section>
    );
  }

  const recommendedGroups = getRecommendedGroups(fatigueData);

  const handleClick = (group: MuscleGroup) => {
    const [firstMuscle] = expandMuscleGroup(group);
    onSelectMuscle(firstMuscle);
  };

  return (
    <section
      className="border-b border-emerald-100 bg-emerald-50 px-4 py-3"
      aria-label="今日のおすすめ"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-emerald-900">
          今日のおすすめ
        </span>
        {recommendedGroups.length > 0 ? (
          recommendedGroups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => handleClick(group)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {MUSCLE_GROUP_LABELS[group]}
            </button>
          ))
        ) : (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
            今日は休養日 💤
          </span>
        )}
      </div>
    </section>
  );
}
