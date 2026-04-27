import { MUSCLE_GROUPS, expandMuscleGroup } from '@/types/domain';
import type { MuscleGroup, MuscleId } from '@/types/domain';

export function collapseToGroups(
  impacts: Partial<Record<MuscleId, number>>,
): Partial<Record<MuscleGroup, number>> {
  const result: Partial<Record<MuscleGroup, number>> = {};
  for (const group of MUSCLE_GROUPS) {
    const ids = expandMuscleGroup(group);
    const values = ids.map((id) => impacts[id] ?? 0);
    const max = Math.max(...values);
    if (max > 0) result[group] = max;
  }
  return result;
}
