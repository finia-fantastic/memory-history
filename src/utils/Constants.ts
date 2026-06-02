// Base resolution (2048x1316 reference from original Python app)
export const BASE_W = 2048;
export const BASE_H = 1316;

// Game display resolution
export const GAME_W = 1280;
export const GAME_H = 720;

// Pixel art resolution for horror sub-game
export const PIXEL_W = 480;
export const PIXEL_H = 270;

// Hotspot coordinates (from original app, in base resolution)
export const HOTSPOTS = {
  wordbook:   { x: 200, y: 308, w: 320, h: 140, label: '单词本' },
  ocr:        { x: 200, y: 458, w: 320, h: 144, label: '单词管理' },
  modeSwitch: { x: 1320, y: 110, w: 600, h: 190, label: '模式切换' },
  beginTest:  { x: 180, y: 680, w: 300, h: 70, label: '开始测验' },
  voice:      { x: 500, y: 680, w: 150, h: 70, label: '语音' },
  submit:     { x: 180, y: 980, w: 420, h: 150, label: '提交答案' },
  aiChat:     { x: 950, y: 980, w: 200, h: 150, label: 'AI对话' },
  dramaViewer: { x: 1000, y: 1150, w: 100, h: 50, label: '剧情' },
} as const;

// Easter egg words (from original app)
export const EASTER_EGGS: Record<string, string> = {
  arm: '手臂是力量的象征，拿起你的剑去战斗吧！',
  nobleman: '贵族不仅仅是身份，更是一种责任和荣耀。',
  cat: '(>^ω^<) 喵～ 你就是我的小猫咪！',
  sword: '剑之所指，心之所向。准备好了吗？',
  war: '战争带来的只有伤痛...但有时我们不得不战。',
  '待机': '嘘～我在等待时机... zzz...',
};

// Horror sub-game trigger word
export const HORROR_TRIGGER = 'nightmare';

// Asset paths
export const ASSET_PATHS = {
  mainUI: 'assets/main/ui/',
  mainDrama: 'assets/main/drama/',
  mainAvatar: 'assets/main/avatar/',
  horrorSprites: 'assets/horror/sprites/',
  horrorTilesets: 'assets/horror/tilesets/',
  horrorBackgrounds: 'assets/horror/backgrounds/',
  horrorAudio: 'assets/horror/audio/',
} as const;

// Colors
export const COLORS = {
  bgBeige: 0xefe8da,
  titleBarDark: 0x2d2d2d,
  accentBlue: 0x4a90d9,
  tabInactive: 0xd4c5a8,
  contentBg: 0xfcf7eb,
  correctGreen: 0x4caf50,
  wrongRed: 0xf44336,
  textDark: 0x333333,
  textLight: 0xffffff,
  horrorDark: 0x1a1a2e,
  horrorAccent: 0xe94560,
} as const;
