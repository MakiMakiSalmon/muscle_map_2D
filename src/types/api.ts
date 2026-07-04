import type {
  CurrentFatigueMap,
  Exercise,
  MuscleId,
  WorkoutSession,
} from './domain';

export interface FatigueSnapshotDto {
  id: string;
  muscleId: MuscleId;
  value: number;
  recordedAt: string;
  createdAt: string;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
}

export type ExerciseDto = Exercise;

export type WorkoutSessionDto = WorkoutSession;

export interface CurrentFatigueResponse {
  data: CurrentFatigueMap;
}

export interface FatigueHistoryResponse {
  history: FatigueSnapshotDto[];
}

export interface SaveFatigueResponse {
  snapshot: FatigueSnapshotDto;
}

export interface ResetFatigueResponse {
  resetAt: string;
}

export interface ExercisesResponse {
  exercises: ExerciseDto[];
}

export interface WorkoutSaveResultDto {
  session: WorkoutSessionDto;
  fatigueImpacts: Partial<Record<MuscleId, number>>;
}

export interface WorkoutHistoryResponse {
  sessions: WorkoutSessionDto[];
  nextCursor: string | null;
}

export interface DeleteWorkoutResponse {
  deletedSessionId: string;
  affectedMuscles: MuscleId[];
}
