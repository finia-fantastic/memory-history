export interface SaveData {
  version: number;
  timestamp: string;
  main: {
    wordsImported: boolean;
    dramaCompletedActs: number[];
    dramaBranchChoices: Record<string, string>;
    quizStats: {
      totalQuizzes: number;
      totalCorrect: number;
      totalWrong: number;
      streak: number;
    };
  };
  horror: {
    unlocked: boolean;
    completedChapters: number[];
    ending: string | null;
    collectibles: string[];
  };
}
