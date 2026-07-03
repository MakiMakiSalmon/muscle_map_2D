import { create } from 'zustand';
import type { MuscleId } from '@/types/domain';

export interface ToastItem {
  id: number;
  type: 'error' | 'success';
  message: string;
}

let nextToastId = 1;

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

  toasts: ToastItem[];
  pushToast: (type: ToastItem['type'], message: string) => void;
  dismissToast: (id: number) => void;
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

  toasts: [],
  pushToast: (type, message) => {
    const id = nextToastId++;
    set((state) => ({
      toasts: [{ id, type, message }, ...state.toasts].slice(0, 3),
    }));
    globalThis.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 4_000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
