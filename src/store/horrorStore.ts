import { create } from 'zustand';

interface HorrorState {
  unlocked: boolean;
  completedChapters: number[];
  currentChapter: number;
  ending: string | null;
  collectibles: string[];

  unlock: () => void;
  completeChapter: (ch: number) => void;
  setCurrentChapter: (ch: number) => void;
  setEnding: (ending: string) => void;
  addCollectible: (id: string) => void;
  reset: () => void;
}

export const useHorrorStore = create<HorrorState>((set) => ({
  unlocked: false,
  completedChapters: [],
  currentChapter: 1,
  ending: null,
  collectibles: [],

  unlock: () => set({ unlocked: true }),
  completeChapter: (ch) =>
    set((s) => ({
      completedChapters: s.completedChapters.includes(ch) ? s.completedChapters : [...s.completedChapters, ch],
    })),
  setCurrentChapter: (ch) => set({ currentChapter: ch }),
  setEnding: (ending) => set({ ending }),
  addCollectible: (id) =>
    set((s) => ({
      collectibles: s.collectibles.includes(id) ? s.collectibles : [...s.collectibles, id],
    })),
  reset: () =>
    set({ completedChapters: [], currentChapter: 1, ending: null, collectibles: [] }),
}));
