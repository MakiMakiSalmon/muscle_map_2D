import { create } from 'zustand';
import type { MuscleId } from '@/types/domain';

interface UIStore {
  bodyView: 'front' | 'back';
  setBodyView: (view: 'front' | 'back') => void;

  selectedMuscle: MuscleId | null;
  setSelectedMuscle: (id: MuscleId | null) => void;

  activePanelTab: 'input' | 'history' | 'workout';
  setActivePanelTab: (tab: 'input' | 'history' | 'workout') => void;

  isWorkoutModalOpen: boolean;
  openWorkoutModal: () => void;
  closeWorkoutModal: () => void;

  isResetModalOpen: boolean;
  openResetModal: () => void;
  closeResetModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  bodyView: 'front',
  setBodyView: (view) => set({ bodyView: view }),

  selectedMuscle: null,
  setSelectedMuscle: (id) => set({ selectedMuscle: id }),

  activePanelTab: 'input',
  setActivePanelTab: (tab) => set({ activePanelTab: tab }),

  isWorkoutModalOpen: false,
  openWorkoutModal: () => set({ isWorkoutModalOpen: true }),
  closeWorkoutModal: () => set({ isWorkoutModalOpen: false }),

  isResetModalOpen: false,
  openResetModal: () => set({ isResetModalOpen: true }),
  closeResetModal: () => set({ isResetModalOpen: false }),
}));
