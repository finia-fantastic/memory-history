import { create } from 'zustand';
import type { Word, ReviewStats, QuizMode } from '../types/word';

interface WordState {
  words: Word[];
  stats: ReviewStats;
  isLoading: boolean;

  setWords: (words: Word[]) => void;
  addWord: (word: Word) => void;
  removeWord: (id: number) => void;
  updateWord: (id: number, updates: Partial<Word>) => void;
  setStats: (stats: ReviewStats) => void;
  setLoading: (loading: boolean) => void;
}

export const useWordStore = create<WordState>((set) => ({
  words: [],
  stats: { total: 0, learning: 0, reviewing: 0, mastered: 0, todayReviewed: 0 },
  isLoading: false,

  setWords: (words) => set({ words }),
  addWord: (word) => set((state) => ({ words: [word, ...state.words] })),
  removeWord: (id) => set((state) => ({ words: state.words.filter((w) => w.id !== id) })),
  updateWord: (id, updates) =>
    set((state) => ({
      words: state.words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Quiz Store
interface QuizState {
  mode: QuizMode;
  words: Word[];
  currentIndex: number;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  isActive: boolean;
  isWaiting: boolean;
  isFinished: boolean;
  wrongWords: Word[];
  userAnswer: string;

  startQuiz: (words: Word[], mode: QuizMode) => void;
  submitAnswer: (answer: string) => boolean;
  nextWord: () => void;
  finishQuiz: () => void;
  retryWrongWords: () => void;
  skipWord: () => void;
  setMode: (mode: QuizMode) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  mode: 'daily',
  words: [],
  currentIndex: 0,
  totalCount: 0,
  correctCount: 0,
  wrongCount: 0,
  isActive: false,
  isWaiting: false,
  isFinished: false,
  wrongWords: [],
  userAnswer: '',

  startQuiz: (words, mode) =>
    set({
      words,
      mode,
      currentIndex: 0,
      totalCount: words.length,
      correctCount: 0,
      wrongCount: 0,
      isActive: true,
      isWaiting: false,
      isFinished: false,
      wrongWords: [],
    }),

  submitAnswer: (answer) => {
    const state = get();
    const current = state.words[state.currentIndex];
    if (!current) return false;
    const isCorrect = answer.trim().toLowerCase() === current.chinese.trim().toLowerCase();
    set((s) => ({
      correctCount: isCorrect ? s.correctCount + 1 : s.correctCount,
      wrongCount: isCorrect ? s.wrongCount : s.wrongCount + 1,
      wrongWords: isCorrect ? s.wrongWords : [...s.wrongWords, current],
      isWaiting: true,
      userAnswer: answer,
    }));
    return isCorrect;
  },

  nextWord: () => {
    const state = get();
    if (state.currentIndex + 1 >= state.totalCount) {
      set({ isFinished: true, isActive: false, isWaiting: false });
    } else {
      set((s) => ({ currentIndex: s.currentIndex + 1, isWaiting: false }));
    }
  },

  finishQuiz: () => set({ isActive: false, isFinished: true, isWaiting: false }),

  retryWrongWords: () => {
    const wrong = get().wrongWords;
    if (wrong.length > 0) {
      set({
        words: wrong,
        currentIndex: 0,
        totalCount: wrong.length,
        correctCount: 0,
        wrongCount: 0,
        isActive: true,
        isFinished: false,
        isWaiting: false,
        wrongWords: [],
      });
    }
  },

  skipWord: () => {
    const state = get();
    if (state.currentIndex + 1 >= state.totalCount) {
      set({ isFinished: true, isActive: false });
    } else {
      set((s) => ({ currentIndex: s.currentIndex + 1 }));
    }
  },

  setMode: (mode) => set({ mode }),
  reset: () =>
    set({
      words: [],
      currentIndex: 0,
      isActive: false,
      isWaiting: false,
      isFinished: false,
      wrongWords: [],
      correctCount: 0,
      wrongCount: 0,
      userAnswer: '',
    }),
}));
