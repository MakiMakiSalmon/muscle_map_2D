export const MUSCLE_IDS = [
  'head', 'chest', 'back', 'abs',
  'shoulders_left', 'shoulders_right',
  'biceps_left',    'biceps_right',
  'triceps_left',   'triceps_right',
  'forearms_left',  'forearms_right',
  'thighs_left',    'thighs_right',
  'calves_left',    'calves_right',
] as const;

export type MuscleId = typeof MUSCLE_IDS[number];

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  head:             '頭部',
  chest:            '胸部',
  back:             '背中',
  abs:              '腹部',
  shoulders_left:   '肩（左）',
  shoulders_right:  '肩（右）',
  biceps_left:      '上腕二頭筋（左）',
  biceps_right:     '上腕二頭筋（右）',
  triceps_left:     '上腕三頭筋（左）',
  triceps_right:    '上腕三頭筋（右）',
  forearms_left:    '前腕（左）',
  forearms_right:   '前腕（右）',
  thighs_left:      '太もも（左）',
  thighs_right:     '太もも（右）',
  calves_left:      'ふくらはぎ（左）',
  calves_right:     'ふくらはぎ（右）',
};

export const MUSCLE_GROUPS = [
  'head', 'chest', 'back', 'abs',
  'shoulders', 'biceps', 'triceps', 'forearms', 'thighs', 'calves',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  head:      '頭部',
  chest:     '胸部',
  back:      '背中',
  abs:       '腹部',
  shoulders: '肩',
  biceps:    '二頭筋',
  triceps:   '三頭筋',
  forearms:  '前腕',
  thighs:    '太もも',
  calves:    'ふくらはぎ',
};

export function expandMuscleGroup(group: MuscleGroup): MuscleId[] {
  switch (group) {
    case 'head':      return ['head'];
    case 'chest':     return ['chest'];
    case 'back':      return ['back'];
    case 'abs':       return ['abs'];
    case 'shoulders': return ['shoulders_left', 'shoulders_right'];
    case 'biceps':    return ['biceps_left',    'biceps_right'];
    case 'triceps':   return ['triceps_left',   'triceps_right'];
    case 'forearms':  return ['forearms_left',  'forearms_right'];
    case 'thighs':    return ['thighs_left',    'thighs_right'];
    case 'calves':    return ['calves_left',    'calves_right'];
  }
}

export const MUSCLE_RECOVERY_HOURS: Record<MuscleId, number> = {
  head:             24,
  chest:            48,
  back:             72,
  abs:              48,
  shoulders_left:   48, shoulders_right:  48,
  biceps_left:      48, biceps_right:     48,
  triceps_left:     48, triceps_right:    48,
  forearms_left:    36, forearms_right:   36,
  thighs_left:      72, thighs_right:     72,
  calves_left:      48, calves_right:     48,
};

export interface FatigueSnapshot {
  id: string;
  muscleId: MuscleId;
  value: number;
  recordedAt: Date;
  createdAt: Date;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
}

// applyWorkoutToFatigue の戻り値 / POST /api/workout の batch write に渡す shape
export type FatigueSnapshotInput = Pick<FatigueSnapshot, 'muscleId' | 'value' | 'source' | 'workoutSessionId'> & {
  recordedAt: Date;
  createdAt: Date;
};

export interface CurrentFatigueEntry {
  savedValue: number;
  currentValue: number;
  recordedAt: string;               // ISO 8601 UTC
  recoveryHoursRemaining: number;
}

export type CurrentFatigueMap = Record<MuscleId, CurrentFatigueEntry>;

export interface Exercise {
  id: string;
  nameJa: string;
  nameEn: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

export interface WorkoutExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
}

export interface WorkoutSession {
  id: string;
  performedAt: string;              // ISO 8601 UTC
  exercises: WorkoutExerciseInput[];
  fatigueImpacts?: Partial<Record<MuscleId, number>>;
}

export interface WorkoutSaveResult {
  session: WorkoutSession;
  fatigueImpacts: Partial<Record<MuscleId, number>>;
}
