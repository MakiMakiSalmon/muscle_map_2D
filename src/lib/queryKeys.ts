import type { MuscleId } from '@/types/domain';

export const queryKeys = {
  fatigue: {
    current:         ['fatigue', 'current']                       as const,
    history: (id: MuscleId) => ['fatigue', 'history', id]        as const,
  },
  workout: {
    history:         ['workout', 'history']                       as const,
  },
  exercises: {
    list: (q: string) => ['exercises', q]                        as const,
    all:              ['exercises', 'all']                       as const,
  },
} as const;
