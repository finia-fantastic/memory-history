import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { WalkScene } from './scenes/WalkScene';
import { CityLightScene } from './scenes/CityLightScene';
import { ChurchMapScene } from './scenes/ChurchMapScene';
import { DramaScene } from './scenes/DramaScene';
import { SettingsScene } from './scenes/SettingsScene';

// Horror sub-game scenes
import { HorrorEntryScene } from './scenes/horror/HorrorEntryScene';
import { Chapter1SideScroll } from './scenes/horror/Chapter1SideScroll';
import { Chapter2TopDown } from './scenes/horror/Chapter2TopDown';
import { Chapter3SideScroll } from './scenes/horror/Chapter3SideScroll';
import { Chapter4Final } from './scenes/horror/Chapter4Final';
import { HorrorEndScene } from './scenes/horror/HorrorEndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },  // 俯视角无重力
      debug: false,               // 设为 true 可看物理调试
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    CityLightScene,
    ChurchMapScene,
    WalkScene,
    GameScene,
    DramaScene,
    SettingsScene,
    // Horror sub-game
    HorrorEntryScene,
    Chapter1SideScroll,
    Chapter2TopDown,
    Chapter3SideScroll,
    Chapter4Final,
    HorrorEndScene,
  ],
};

// Start the game
new Phaser.Game(config);
