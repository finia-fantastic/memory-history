export interface PlayerState {
  x: number;
  y: number;
  facing: 'left' | 'right';
  animState: 'idle' | 'walk' | 'run' | 'crouch' | 'interact' | 'scared';
  stamina: number;
  isHidden: boolean;
}

export interface MonsterState {
  id: string;
  x: number;
  y: number;
  patrolPath: { x: number; y: number }[];
  currentPathIndex: number;
  state: 'patrol' | 'chase' | 'stun';
  speed: number;
  visionRange: number;
}

export interface HorrorChapterConfig {
  id: number;
  name: string;
  view: 'sidescroll' | 'topdown' | 'mixed';
  mapKey: string;
  playerStart: { x: number; y: number };
  exits: { x: number; y: number; target: string }[];
  monsters: MonsterState[];
  npcs: { id: string; x: number; y: number; dialogTree: string }[];
  collectibles: { id: string; x: number; y: number }[];
}
