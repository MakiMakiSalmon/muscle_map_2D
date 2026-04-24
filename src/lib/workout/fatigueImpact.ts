import { type MuscleId, type Exercise, expandMuscleGroup } from '@/types/domain';

export function computeFatigueImpact(
  exercise: Exercise,
  sets: number,
  reps: number | null,
): Partial<Record<MuscleId, number>> {
  const effectiveReps = reps ?? 10;
  const volume = sets * effectiveReps;
  const baseVolume = 30;

  const primaryDelta   = Math.min(80, Math.round(40 * volume / baseVolume));
  const secondaryDelta = Math.min(40, Math.round(20 * volume / baseVolume));

  const impacts: Partial<Record<MuscleId, number>> = {};
  for (const group of exercise.primaryMuscles) {
    for (const muscleId of expandMuscleGroup(group)) {
      impacts[muscleId] = primaryDelta;
    }
  }
  for (const group of exercise.secondaryMuscles) {
    for (const muscleId of expandMuscleGroup(group)) {
      impacts[muscleId] = (impacts[muscleId] ?? 0) + secondaryDelta;
    }
  }
  return impacts;
}

export function mergeImpacts(
  impacts: Partial<Record<MuscleId, number>>[],
): Partial<Record<MuscleId, number>> {
  const merged: Partial<Record<MuscleId, number>> = {};
  for (const impact of impacts) {
    for (const [muscleId, delta] of Object.entries(impact) as [MuscleId, number][]) {
      merged[muscleId] = (merged[muscleId] ?? 0) + delta;
    }
  }
  return merged;
}
