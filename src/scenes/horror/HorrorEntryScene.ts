import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

export class HorrorEntryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HorrorEntryScene' });
  }

  create(): void {
    // Set pixel-perfect rendering for horror sub-game
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    // Title in pixel font
    const title = this.add.text(PIXEL_W / 2, PIXEL_H / 2 - 60, '???', {
      ...pixelTextStyle(16, '#ff4444'),
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(PIXEL_W / 2, PIXEL_H / 2 - 20, '~ 隐藏的记忆 ~', {
      ...pixelTextStyle(8, '#888888'),
    }).setOrigin(0.5).setAlpha(0);

    // Fade in text
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 2000,
      ease: 'Sine.easeIn',
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 3000,
      delay: 1000,
      ease: 'Sine.easeIn',
    });

    // Glitch effect on title
    this.time.delayedCall(2500, () => {
      this.cameras.main.shake(200, 0.005);
    });

    // Auto-start or prompt
    this.time.delayedCall(4000, () => {
      const prompt = this.add.text(PIXEL_W / 2, PIXEL_H / 2 + 40, 'Press any key to enter...', {
        ...pixelTextStyle(6, '#666666'),
      }).setOrigin(0.5);

      this.tweens.add({
        targets: prompt,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });

      this.input.keyboard?.once('keydown', () => {
        this.startChapter1();
      });

      // Also allow click
      this.input.once('pointerdown', () => {
        this.startChapter1();
      });
    });
  }

  private startChapter1(): void {
    useHorrorStore.getState().setCurrentChapter(1);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Chapter1SideScroll');
    });
  }
}
