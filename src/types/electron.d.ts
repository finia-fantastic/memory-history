export interface ElectronAPI {
  db: {
    getWords: (filter?: { status?: string; keyword?: string }) => Promise<Word[]>;
    addWord: (english: string, chinese: string) => Promise<{ added: boolean; message: string }>;
    deleteWord: (id: number) => Promise<void>;
    updateWordStatus: (id: number, status: string) => Promise<void>;
    getWordsForReview: (mode: string) => Promise<Word[]>;
    recordReview: (wordId: number, isCorrect: boolean, userAnswer: string) => Promise<void>;
    getReviewStats: () => Promise<ReviewStats>;
    exportCSV: () => Promise<{ success: boolean; path?: string }>;
  };
  save: {
    write: (slot: number, data: string) => Promise<{ success: boolean }>;
    read: (slot: number) => Promise<{ data: unknown; updatedAt: string } | null>;
    listSlots: () => Promise<{ slot: number; updated_at: string }[]>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
