import Phaser from 'phaser';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

export class Chapter4Final extends Phaser.Scene {
  private ending: string | null = null;

  constructor() {
    super({ key: 'Chapter4Final' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    // Chapter title
    this.add.text(PIXEL_W / 2, 30, 'Chapter 4: 真相', {
      ...pixelTextStyle(8, '#ffffff'),
    }).setOrigin(0.5);

    // Story text
    const lines = [
      '你终于到达了最深处的房间...',
      '一面镜子立在房间中央。',
      '镜中的你，瞳孔泛着诡异的光。',
      '你想起了所有事情。',
      '这个学习软件从来不只是学习软件。',
      '它是...一扇门。',
      '',
      '现在，你必须选择:',
    ];

    lines.forEach((line, i) => {
      this.time.delayedCall(2000 + i * 1500, () => {
        this.add.text(PIXEL_W / 2, 80 + i * 24, line, {
          ...pixelTextStyle(6, i === lines.length - 1 ? '#ffcc00' : '#cccccc'),
        }).setOrigin(0.5);
      });
    });

    // Choice buttons
    this.time.delayedCall(2000 + lines.length * 1500 + 1000, () => {
      this.showChoices();
    });
  }

  private showChoices(): void {
    // Choice 1: Accept the truth
    const choice1 = this.add.text(PIXEL_W / 2, PIXEL_H - 80, '> 接受真相，释放一切', {
      ...pixelTextStyle(7, '#00ff88'),
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Choice 2: Reject it
    const choice2 = this.add.text(PIXEL_W / 2, PIXEL_H - 50, '> 拒绝相信，回到现实', {
      ...pixelTextStyle(7, '#ff8800'),
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Hidden choice 3: Stay silent (only if all collectibles found)
    const hasAllCollectibles = useHorrorStore.getState().collectibles.length >= 3;
    let choice3: Phaser.GameObjects.Text | undefined;

    if (hasAllCollectibles) {
      choice3 = this.add.text(PIXEL_W / 2, PIXEL_H - 20, '> ... （沉默）', {
        ...pixelTextStyle(7, '#888888'),
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      choice3.on('pointerover', () => { choice3!.setColor('#ffffff'); });
      choice3.on('pointerout', () => { choice3!.setColor('#888888'); });
      choice3.on('pointerdown', () => {
        this.chooseEnding('hidden');
      });
    }

    choice1.on('pointerover', () => { choice1.setColor('#00ffcc'); });
    choice1.on('pointerout', () => { choice1.setColor('#00ff88'); });
    choice1.on('pointerdown', () => {
      this.chooseEnding('true');
    });

    choice2.on('pointerover', () => { choice2.setColor('#ffbb00'); });
    choice2.on('pointerout', () => { choice2.setColor('#ff8800'); });
    choice2.on('pointerdown', () => {
      this.chooseEnding('normal');
    });
  }

  private chooseEnding(ending: string): void {
    this.ending = ending;
    useHorrorStore.getState().setEnding(ending);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 255);

    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(2000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('HorrorEndScene', { ending });
      });
    });
  }
}
