import { create } from 'zustand';

export type GamePhase = 'boot' | 'title' | 'game' | 'drama' | 'horror' | 'settings';

interface GameState {
  phase: GamePhase;
  previousPhase: GamePhase | null;
  isHorrorUnlocked: boolean;
  isHorrorActive: boolean;
  horrorTriggerWord: string;

  setPhase: (phase: GamePhase) => void;
  enterHorror: () => void;
  exitHorror: () => void;
  unlockHorror: () => void;
  returnToPrevious: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'boot',
  previousPhase: null,
  isHorrorUnlocked: false,
  isHorrorActive: false,
  horrorTriggerWord: 'nightmare',

  setPhase: (phase) => set((state) => ({ previousPhase: state.phase, phase })),
  enterHorror: () => set({ previousPhase: 'game', phase: 'horror', isHorrorActive: true }),
  exitHorror: () => set({ phase: 'game', isHorrorActive: false }),
  unlockHorror: () => set({ isHorrorUnlocked: true }),
  returnToPrevious: () => {
    const prev = get().previousPhase;
    if (prev) set({ phase: prev, previousPhase: null });
  },
}));
