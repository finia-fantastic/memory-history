import { create } from 'zustand';
import type { DramaState } from '../types/drama';

interface DramaStore extends DramaState {
  setCurrentAct: (act: number) => void;
  completeAct: (act: number) => void;
  recordChoice: (actId: number, choice: string) => void;
  setIsPlaying: (v: boolean) => void;
  reset: () => void;
}

export const useDramaStore = create<DramaStore>((set) => ({
  currentAct: 0,
  completedActs: [],
  branchChoices: {},
  isPlaying: false,

  setCurrentAct: (act) => set({ currentAct: act }),
  completeAct: (act) =>
    set((s) => ({
      completedActs: s.completedActs.includes(act) ? s.completedActs : [...s.completedActs, act],
    })),
  recordChoice: (actId, choice) =>
    set((s) => ({ branchChoices: { ...s.branchChoices, [`act${actId}`]: choice } })),
  setIsPlaying: (v) => set({ isPlaying: v }),
  reset: () => set({ currentAct: 0, completedActs: [], branchChoices: {}, isPlaying: false }),
}));
