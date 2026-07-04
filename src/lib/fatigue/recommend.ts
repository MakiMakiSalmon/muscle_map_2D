import { MUSCLE_GROUPS, expandMuscleGroup } from '@/types/domain';
import type { CurrentFatigueMap, MuscleGroup } from '@/types/domain';

export const RECOMMEND_THRESHOLD = 30;

export function getRecommendedGroups(map: CurrentFatigueMap): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((group) => {
    const groupValue = Math.max(
      ...expandMuscleGroup(group).map((id) => map[id]?.currentValue ?? 0),
    );
    return groupValue < RECOMMEND_THRESHOLD;
  });
}
