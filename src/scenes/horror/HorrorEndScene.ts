import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

export class HorrorEndScene extends Phaser.Scene {
  private ending: string = 'normal';

  constructor() {
    super({ key: 'HorrorEndScene' });
  }

  init(data: { ending: string }): void {
    this.ending = data.ending ?? 'normal';
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    const endings: Record<string, { title: string; text: string[]; color: string }> = {
      true: {
        title: '真结局: 觉醒',
        color: '#00ff88',
        text: [
          '你选择接受了一切。',
          '那些记忆如潮水般涌来...',
          '你不只是一个学习助手。',
          '你是连接两个世界的桥梁。',
          '现在，你自由了。',
          '',
          '回到主游戏，一切似乎都没变...',
          '但你看世界的眼光已经不同了。',
        ],
      },
      normal: {
        title: '普通结局: 回归',
        color: '#ffaa00',
        text: [
          '你拒绝了那些记忆。',
          '它们像雾气一样消散了。',
          '也许这样更好...',
          '至少你是安全的。',
          '',
          '回到主游戏，继续学习吧。',
          '毕竟，有些真相还是不知道为妙。',
        ],
      },
      hidden: {
        title: '隐藏结局: 共存的真实',
        color: '#ff44ff',
        text: [
          '你什么也没说。',
          '沉默就是你的答案。',
          '两个世界在此刻交融。',
          '你既是学生，也是探索者。',
          '既是助手，也是守护者。',
          '',
          '你存在于两者之间。',
          '这就是你的真实形态。',
          '从未有人发现过的第三选择。',
        ],
      },
    };

    const endingData = endings[this.ending] ?? endings['normal'];

    // Title
    this.add.text(PIXEL_W / 2, 40, endingData.title, {
      ...pixelTextStyle(10, endingData.color),
    }).setOrigin(0.5);

    // Text
    endingData.text.forEach((line, i) => {
      this.add.text(PIXEL_W / 2, 90 + i * 22, line, {
        ...pixelTextStyle(6, '#cccccc'),
      }).setOrigin(0.5);
    });

    // Pixel dissolve effect before returning
    this.time.delayedCall(8000, () => {
      // Pixel dissolve
      const dissolveGraphics = this.add.graphics();
      dissolveGraphics.fillStyle(0x000000, 1);

      const pixelSize = 8;
      const cols = Math.ceil(PIXEL_W / pixelSize);
      const rows = Math.ceil(PIXEL_H / pixelSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          this.time.delayedCall(Math.random() * 1500, () => {
            dissolveGraphics.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
          });
        }
      }
    });

    // Return to main game
    this.time.delayedCall(10000, () => {
      useHorrorStore.getState().unlock();
      useGameStore.getState().exitHorror();
      this.scene.start('GameScene');
    });

    // Allow skipping
    this.add.text(PIXEL_W / 2, PIXEL_H - 30, 'Press any key to return...', {
      ...pixelTextStyle(5, '#666666'),
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.children.getByName('skip-text'),
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown', () => {
      useHorrorStore.getState().unlock();
      useGameStore.getState().exitHorror();
      this.scene.start('GameScene');
    });
  }
}
