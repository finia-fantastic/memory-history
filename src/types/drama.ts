export interface DramaActConfig {
  actId: number;
  name: string;
  slides: DramaSlideConfig[];
  mode: 'auto' | 'click' | 'branch-input' | 'branch-choice';
  branchPrompt?: string;
  branchOptions?: DramaBranchOption[];
  autoDelays?: Record<number, number>;
  onEndNextAct?: number;
}

export interface DramaSlideConfig {
  path: string;
  delay?: number;
}

export interface DramaBranchOption {
  label: string;
  value: string;
  nextActId: number;
}

export interface DramaState {
  currentAct: number;
  completedActs: number[];
  branchChoices: Record<string, string>;
  isPlaying: boolean;
}
