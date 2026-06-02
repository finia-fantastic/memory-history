import { create } from 'zustand';
import type { Word } from '../../types/word';

interface WordManagerState {
  words: Word[];
  selectedWord: Word | null;
  searchKeyword: string;

  setWords: (words: Word[]) => void;
  selectWord: (word: Word | null) => void;
  setSearchKeyword: (kw: string) => void;
  getFilteredWords: () => Word[];
}

export const useWordManagerStore = create<WordManagerState>((set, get) => ({
  words: [],
  selectedWord: null,
  searchKeyword: '',

  setWords: (words) => set({ words }),
  selectWord: (word) => set({ selectedWord: word }),
  setSearchKeyword: (kw) => set({ searchKeyword: kw }),
  getFilteredWords: () => {
    const { words, searchKeyword } = get();
    if (!searchKeyword) return words;
    const kw = searchKeyword.toLowerCase();
    return words.filter(
      w => w.english.toLowerCase().includes(kw) || w.chinese.includes(kw)
    );
  },
}));
