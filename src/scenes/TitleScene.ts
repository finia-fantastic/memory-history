import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useHorrorStore } from '../store/horrorStore';
import { GAME_W, GAME_H } from '../utils/Constants';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    useGameStore.getState().setPhase('title');
    const isHorrorUnlocked = useHorrorStore.getState().unlocked;

    // Simple solid background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Decorative gradient bars
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0f3460, 1);
    gfx.fillRect(0, 0, GAME_W, 200);
    gfx.fillStyle(0x16213e, 1);
    gfx.fillRect(0, 500, GAME_W, 220);

    // Title
    this.add.text(GAME_W / 2, 140, '🐱 猫咪学习助手', {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Subtitle
    this.add.text(GAME_W / 2, 195, '~ Cat Learning Companion ~', {
      fontFamily: 'Arial, Georgia, serif',
      fontSize: '16px',
      color: '#88aacc',
    }).setOrigin(0.5).setDepth(10);

    // Menu buttons with big visible style
    const btnY = 290;
    const btnGap = 70;

    this.makeButton('🎮  新 游 戏', btnY, () => {
      // Enter the room — player controls the cat
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WalkScene');
      });
    });

    this.makeButton('▶  继 续 游 戏', btnY + btnGap, () => {
      this.scene.start('GameScene', { newGame: false });
    });

    this.makeButton('⚙  设 置', btnY + btnGap * 2, () => {
      this.scene.start('SettingsScene');
    });

    const exitBtnY = btnY + btnGap * 3;
    // Exit
    const exitBg = this.add.graphics().setDepth(10);
    exitBg.fillStyle(0x555555, 1);
    exitBg.fillRoundedRect(GAME_W / 2 - 140, exitBtnY - 24, 280, 48, 10);

    const exitText = this.add.text(GAME_W / 2, exitBtnY, '✕  退 出', {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#cccccc',
    }).setOrigin(0.5).setDepth(11);

    const exitZone = this.add.zone(GAME_W / 2, exitBtnY, 280, 48)
      .setInteractive({ useHandCursor: true }).setDepth(12);
    exitZone.on('pointerover', () => {
      exitBg.clear();
      exitBg.fillStyle(0x777777, 1);
      exitBg.fillRoundedRect(GAME_W / 2 - 140, exitBtnY - 24, 280, 48, 10);
    });
    exitZone.on('pointerout', () => {
      exitBg.clear();
      exitBg.fillStyle(0x555555, 1);
      exitBg.fillRoundedRect(GAME_W / 2 - 140, exitBtnY - 24, 280, 48, 10);
    });
    exitZone.on('pointerdown', () => {
      window.close();
    });

    // Hidden horror entry
    if (isHorrorUnlocked) {
      const hx = GAME_W - 70;
      const hy = GAME_H - 50;
      this.add.text(hx, hy, '???', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff3333',
      }).setOrigin(0.5).setAlpha(0.5).setDepth(10).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          useGameStore.getState().enterHorror();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('HorrorEntryScene');
          });
        });
    }

    // Version
    this.add.text(GAME_W - 15, GAME_H - 15, 'v1.0.0', {
      fontSize: '11px',
      color: '#444466',
    }).setOrigin(1, 1).setDepth(10);

    // Floating particles
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(30, GAME_W - 30);
      const y = Phaser.Math.Between(30, GAME_H - 30);
      const r = Phaser.Math.Between(1, 4);
      const dot = this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.08, 0.25)).setDepth(1);
      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(30, 80),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
      });
    }
  }

  private makeButton(label: string, y: number, callback: () => void): void {
    const w = 300;
    const h = 50;
    const x = GAME_W / 2;

    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(0x3355aa, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    // border
    bg.lineStyle(2, 0x5577cc, 1);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    this.add.text(x, y, label, {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    const zone = this.add.zone(x, y, w, h)
      .setInteractive({ useHandCursor: true }).setDepth(12);

    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4477cc, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(2, 0x6699ee, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x3355aa, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(2, 0x5577cc, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    });
    zone.on('pointerdown', callback);
  }
}
