import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  db: {
    getWords: (filter?: { status?: string; keyword?: string }) =>
      ipcRenderer.invoke('db:getWords', filter),
    addWord: (english: string, chinese: string) =>
      ipcRenderer.invoke('db:addWord', english, chinese),
    deleteWord: (id: number) =>
      ipcRenderer.invoke('db:deleteWord', id),
    updateWordStatus: (id: number, status: string) =>
      ipcRenderer.invoke('db:updateWordStatus', id, status),
    getWordsForReview: (mode: string) =>
      ipcRenderer.invoke('db:getWordsForReview', mode),
    recordReview: (wordId: number, isCorrect: boolean, userAnswer: string) =>
      ipcRenderer.invoke('db:recordReview', wordId, isCorrect, userAnswer),
    getReviewStats: () =>
      ipcRenderer.invoke('db:getReviewStats'),
    exportCSV: () =>
      ipcRenderer.invoke('db:exportCSV'),
  },
  save: {
    write: (slot: number, data: string) =>
      ipcRenderer.invoke('save:write', slot, data),
    read: (slot: number) =>
      ipcRenderer.invoke('save:read', slot),
    listSlots: () =>
      ipcRenderer.invoke('save:listSlots'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
