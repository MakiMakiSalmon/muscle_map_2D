import { type MuscleId, MUSCLE_RECOVERY_HOURS } from '@/types/domain';

export function applyDecay(
  savedValue: number,
  recordedAt: Date,
  muscleId: MuscleId,
  now = new Date(),
): number {
  const recoveryHours = MUSCLE_RECOVERY_HOURS[muscleId];
  const elapsedHours = (now.getTime() - recordedAt.getTime()) / (1000 * 3600);
  const ratio = Math.max(0, 1 - elapsedHours / recoveryHours);
  return Math.min(savedValue, Math.round(savedValue * ratio));
}

export function calcRecoveryHoursRemaining(
  savedValue: number,
  recordedAt: Date,
  muscleId: MuscleId,
  now = new Date(),
): number {
  if (savedValue === 0) return 0;
  const recoveryHours = MUSCLE_RECOVERY_HOURS[muscleId];
  const elapsedHours = (now.getTime() - recordedAt.getTime()) / (1000 * 3600);
  const remaining = Math.max(0, recoveryHours - elapsedHours);
  const currentValue = applyDecay(savedValue, recordedAt, muscleId, now);
  return currentValue === 0 ? 0 : Math.round(remaining * 10) / 10;
}
