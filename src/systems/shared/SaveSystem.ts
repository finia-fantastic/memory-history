import { useWordStore } from '../../store/wordStore';
import { useDramaStore } from '../../store/dramaStore';
import { useHorrorStore } from '../../store/horrorStore';
import { useAIStore } from '../../store/aiStore';
import type { SaveData } from '../../types/save';

const SAVE_SLOT = 1;

export class SaveSystem {
  static async save(): Promise<boolean> {
    if (!window.electronAPI) return false;

    const wordState = useWordStore.getState();
    const dramaState = useDramaStore.getState();
    const horrorState = useHorrorStore.getState();

    const data: SaveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      main: {
        wordsImported: wordState.words.length > 0,
        dramaCompletedActs: dramaState.completedActs,
        dramaBranchChoices: dramaState.branchChoices,
        quizStats: {
          totalQuizzes: 0,
          totalCorrect: 0,
          totalWrong: 0,
          streak: 0,
        },
      },
      horror: {
        unlocked: horrorState.unlocked,
        completedChapters: horrorState.completedChapters,
        ending: horrorState.ending,
        collectibles: horrorState.collectibles,
      },
    };

    const result = await window.electronAPI.save.write(SAVE_SLOT, JSON.stringify(data));
    return result.success;
  }

  static async load(): Promise<SaveData | null> {
    if (!window.electronAPI) return null;

    const result = await window.electronAPI.save.read(SAVE_SLOT);
    if (!result?.data) return null;

    const data = result.data as SaveData;

    // Restore states
    useDramaStore.getState().completeAct(0); // dummy to trigger updates
    data.main.dramaCompletedActs.forEach((act) => useDramaStore.getState().completeAct(act));
    Object.entries(data.main.dramaBranchChoices).forEach(([key, val]) => {
      const actId = parseInt(key.replace('act', ''));
      useDramaStore.getState().recordChoice(actId, val);
    });

    if (data.horror.unlocked) {
      useHorrorStore.getState().unlock();
    }
    data.horror.completedChapters.forEach((ch) => useHorrorStore.getState().completeChapter(ch));
    if (data.horror.ending) {
      useHorrorStore.getState().setEnding(data.horror.ending);
    }
    data.horror.collectibles.forEach((id) => useHorrorStore.getState().addCollectible(id));

    return data;
  }

  static async hasSave(): Promise<boolean> {
    if (!window.electronAPI) return false;
    const slots = await window.electronAPI.save.listSlots();
    return slots.some((s) => s.slot === SAVE_SLOT);
  }

  static async deleteSave(): Promise<void> {
    // Overwrite with empty data
    if (window.electronAPI) {
      await window.electronAPI.save.write(SAVE_SLOT, '{}');
    }
  }
}
