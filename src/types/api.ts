import type { WorkoutSession } from './domain';

export type WorkoutSessionDto = WorkoutSession;

export interface WorkoutHistoryResponse {
  sessions: WorkoutSessionDto[];
  nextCursor: string | null;
}
