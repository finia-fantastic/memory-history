import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { GAME_W, GAME_H } from '../utils/Constants';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const barW = 400;
    const barH = 24;
    const barX = (GAME_W - barW) / 2;
    const barY = GAME_H / 2;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.progressText = this.add.text(GAME_W / 2, barY - 50, '🐱 加载中...', {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x333355, 1);
      this.progressBar.fillRoundedRect(barX, barY, barW, barH, 4);
      this.progressBar.fillStyle(0x4477cc, 1);
      this.progressBar.fillRoundedRect(barX, barY, barW * value, barH, 4);
    });

    // ========== Load BGM ==========
    this.load.audio('bgm-cat', 'assets/main/bgm/枕边的黑猫.mp3');

    // ========== Load room & cat assets ==========
    this.load.image('room-bg', 'assets/main/drama/prologue/房间背景.png');
    this.load.image('city-lights', 'assets/main/drama/prologue/城市灯光.png');
    this.load.image('dayun', 'assets/main/drama/prologue/大运.jpg');
    // 视频单独加载（不通过 Phaser loader）
    this.load.image('ui-main', 'assets/main/ui/ui.png');
    this.load.image('cat-spritesheet', 'assets/main/drama/prologue/白毛行走图.png');
    this.load.image('desktop-screen', 'assets/main/drama/prologue/桌面.png');
    this.load.image('computer-screen', 'assets/main/drama/prologue/电脑屏幕.png');

    // ========== Load all drama images ==========
    const base = 'assets/main/drama';

    // Act 1 (7 slides)
    for (let i = 1; i <= 7; i++) {
      this.load.image(`drama-act1-1-${i}`, `${base}/act1/1-${i}.png`);
    }

    // Act 2 intro + main
    this.load.image('drama-act2-2-1-1', `${base}/act2/2-1-1.png`);
    this.load.image('drama-act2-2-1-2', `${base}/act2/2-1-2.png`);
    this.load.image('drama-act2-2-3', `${base}/act2/2-3.png`);
    this.load.image('drama-act2-2-4', `${base}/act2/2-4.png`);
    this.load.image('drama-act2-2-5', `${base}/act2/2-5.png`);
    this.load.image('drama-act2-2-6', `${base}/act2/2-6.png`);

    // Act 2 special branch (2-2 folder, 10 slides)
    for (let i = 1; i <= 10; i++) {
      this.load.image(`drama-act2-2-2-${i}`, `${base}/act2/2-2/${i}.png`);
    }

    // Act 3 (7 slides)
    for (let i = 1; i <= 7; i++) {
      this.load.image(`drama-act3-${i}`, `${base}/act3/${i}.png`);
    }

    // Act 4 (3 main slides + help/nohelp branches)
    for (let i = 1; i <= 3; i++) {
      this.load.image(`drama-act4-${i}`, `${base}/act4/${i}.png`);
    }
    this.load.image('drama-act4-help-1', `${base}/act4/help/1.png`);
    this.load.image('drama-act4-help-2', `${base}/act4/help/2.png`);
    // nohelp files have Chinese filenames, load them by listing
    const nohelpFiles = [
      '1（开始快闪）.png', '2.png', '3.png', '4.png', '5.png', '6.png',
      '7（结束快闪，不再会有人物）.png',
    ];
    nohelpFiles.forEach((f, i) => {
      this.load.image(`drama-act4-nohelp-${i + 1}`, `${base}/act4/nohelp/${encodeURI(f)}`);
    });

    // Act 5 (4 slides + extra)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`drama-act5-${i}`, `${base}/act5/${i}.png`);
    }

    // Act 6 (3 slides)
    for (let i = 1; i <= 3; i++) {
      this.load.image(`drama-act6-${i}`, `${base}/act6/${i}.png`);
    }

    // Act 7 (2 slides)
    for (let i = 1; i <= 2; i++) {
      this.load.image(`drama-act7-${i}`, `${base}/act7/${i}.png`);
    }

    // AE 动画帧
    for (let i = 0; i < 125; i++) {
      const num = String(i).padStart(5, '0');
      this.load.image(`avatar-${i}`, `assets/main/avatar/frames/组 1_${num}.png`);
    }

    this.load.on('complete', () => {
      this.progressText.setText('加载完成！');
    });
  }

  create(): void {
    // Generate placeholder textures
    this.generateTextures();
    useGameStore.getState().setPhase('title');
    this.scene.start('TitleScene');
  }

  private generateTextures(): void {
    if (!this.textures.exists('ui-bg')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xefe8da, 1);
      gfx.fillRect(0, 0, 1280, 720);
      gfx.generateTexture('ui-bg', 1280, 720);
      gfx.destroy();
    }

    if (!this.textures.exists('pet')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x66bb6a, 1);
      gfx.fillCircle(40, 40, 38);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(28, 30, 9);
      gfx.fillCircle(52, 30, 9);
      gfx.fillStyle(0x222222, 1);
      gfx.fillCircle(28, 30, 4);
      gfx.fillCircle(52, 30, 4);
      gfx.lineStyle(2, 0x222222, 1);
      gfx.beginPath();
      gfx.arc(40, 40, 15, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
      gfx.strokePath();
      gfx.generateTexture('pet', 80, 80);
      gfx.destroy();
    }
  }
}
