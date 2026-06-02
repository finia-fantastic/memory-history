import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useDramaStore } from '../store/dramaStore';
import { useHorrorStore } from '../store/horrorStore';
import { GAME_W, GAME_H } from '../utils/Constants';

// ============================================================
// ★ 旁白/序幕配置 — 在这里编辑你的背景故事 ★
// ============================================================
// 每一条是一个画面：{ image: 图片文件名, title?: 标题, text?: 旁白文字 }
// 图片放到 assets/main/drama/prologue/ 目录下
// ============================================================
const PROLOGUE_SCENES = [
  {
    image: 'bg1.png',
    title: '序幕',
    text: '在一个被遗忘的角落，\n住着一只特别的小猫...',
  },
  {
    image: 'bg2.png',
    title: '',
    text: '它每天陪伴着主人学习，\n日子平静而温馨。',
  },
  {
    image: 'bg3.png',
    title: '',
    text: '直到有一天，\n一个隐藏的入口被发现了...',
  },
  {
    image: 'bg4.png',
    title: '— 猫咪学习助手 —',
    text: '点击继续，进入故事',
  },
];

// ============================================================

interface Slide {
  key: string;
  delay?: number;
  title?: string;
  text?: string;
}

interface ActConfig {
  slides: Slide[];
  mode: 'auto' | 'click' | 'input-like' | 'choice-help';
  isPrologue?: boolean;
}

export class DramaScene extends Phaser.Scene {
  private actId: number = 0;
  private slides: Slide[] = [];
  private currentIndex: number = 0;
  private currentImage?: Phaser.GameObjects.Image;
  private mode: string = 'click';
  private autoTimer?: Phaser.Time.TimerEvent;
  private textOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'DramaScene' });
  }

  init(data: { actId: number }): void {
    this.actId = data.actId ?? 0;
    this.currentIndex = 0;
    this.slides = [];
  }

  create(): void {
    useGameStore.getState().setPhase('drama');
    if (this.actId > 0) {
      useDramaStore.getState().setCurrentAct(this.actId);
    }

    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const config = this.getActConfig(this.actId);
    this.slides = config.slides;
    this.mode = config.mode;

    if (this.slides.length > 0) {
      this.showSlide(0);
    } else {
      this.endAct();
    }

    this.input.on('pointerdown', () => {
      if (this.mode === 'click' || config.isPrologue) {
        this.nextSlide();
      }
    });
  }

  private getActConfig(actId: number): ActConfig {
    // ===== Act 0: Prologue =====
    if (actId === 0) {
      return {
        mode: 'click',
        isPrologue: true,
        slides: PROLOGUE_SCENES.map((s, i) => ({
          key: `drama-prologue-${i}`,
          title: s.title,
          text: s.text,
        })),
      };
    }

    // ===== Acts 1-7 =====
    switch (actId) {
      case 1: return {
        mode: 'click',
        slides: [
          { key: 'drama-act1-1-1', delay: 300 },
          { key: 'drama-act1-1-2' }, { key: 'drama-act1-1-3' },
          { key: 'drama-act1-1-4' }, { key: 'drama-act1-1-5' },
          { key: 'drama-act1-1-6' }, { key: 'drama-act1-1-7' },
        ],
      };
      case 2: return {
        mode: 'input-like',
        slides: [{ key: 'drama-act2-2-1-1' }],
      };
      case 3: return {
        mode: 'click',
        slides: Array.from({ length: 7 }, (_, i) => ({ key: `drama-act3-${i + 1}` })),
      };
      case 4: return {
        mode: 'choice-help',
        slides: [
          { key: 'drama-act4-1' }, { key: 'drama-act4-2' }, { key: 'drama-act4-3' },
        ],
      };
      case 5: return {
        mode: 'click',
        slides: [
          { key: 'drama-act5-1' }, { key: 'drama-act5-2' },
          { key: 'drama-act5-3' }, { key: 'drama-act5-4' },
        ],
      };
      case 6: return {
        mode: 'click',
        slides: [
          { key: 'drama-act6-1' }, { key: 'drama-act6-2' }, { key: 'drama-act6-3' },
        ],
      };
      case 7: return {
        mode: 'click',
        slides: [{ key: 'drama-act7-1' }, { key: 'drama-act7-2' }],
      };
      default: return { mode: 'click', slides: [] };
    }
  }

  private showSlide(index: number): void {
    if (index >= this.slides.length) {
      this.endAct();
      return;
    }

    this.currentIndex = index;
    const slide = this.slides[index];

    // Clear previous
    if (this.currentImage) this.currentImage.destroy();
    if (this.textOverlay) this.textOverlay.destroy();

    // Show image
    if (this.textures.exists(slide.key)) {
      this.currentImage = this.add.image(GAME_W / 2, GAME_H / 2, slide.key);
      const s = Math.min(GAME_W / this.currentImage.width, GAME_H / this.currentImage.height);
      this.currentImage.setScale(s).setDepth(0).setAlpha(0);
    } else {
      // Fallback: dark background
      this.currentImage = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x111122, 1) as unknown as Phaser.GameObjects.Image;
      this.currentImage.setAlpha(0);
    }

    this.tweens.add({ targets: this.currentImage, alpha: 1, duration: 500 });

    // Show prologue text overlay
    if (slide.title || slide.text) {
      this.showNarration(slide.title || '', slide.text || '');
    }

    // Auto-advance
    if (this.mode === 'auto' && slide.delay) {
      this.autoTimer = this.time.delayedCall(slide.delay, () => this.nextSlide());
    }

    // Act 2 "like" input
    if (this.mode === 'input-like' && index === 0) {
      this.showLikeInput();
    }

    // Act 4 choices
    if (this.mode === 'choice-help' && index === 2) {
      this.showHelpChoice();
    }
  }

  // ============ Narration text overlay ============

  private showNarration(title: string, text: string): void {
    this.textOverlay = this.add.container(0, 0).setDepth(5);

    // Semi-transparent bg behind text
    const lines = text.split('\n');
    const boxH = (title ? 50 : 0) + lines.length * 36 + 60;
    const boxY = GAME_H - boxH - 30;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(60, boxY, GAME_W - 120, boxH, 12);
    this.textOverlay.add(bg);

    let y = boxY + 30;
    const overlay = this.textOverlay;

    if (title) {
      const t = this.add.text(GAME_W / 2, y, title, {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: '26px',
        color: '#ffcc66',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      overlay.add(t);
      y += 46;
    }
    lines.forEach((line) => {
      const t = this.add.text(GAME_W / 2, y, line.trim(), {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5, 0);
      overlay.add(t);
      y += 36;
    });

    // Click hint
    const hint = this.add.text(GAME_W / 2, boxY + boxH - 18, '▸ 点击继续 ▸', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5, 0).setAlpha(0);
    this.textOverlay.add(hint);

    this.tweens.add({
      targets: hint, alpha: 1,
      duration: 600, delay: 800,
      yoyo: true, repeat: -1,
    });
  }

  // ============ Slide navigation ============

  private nextSlide(): void {
    if (this.autoTimer) this.autoTimer.remove();
    this.showSlide(this.currentIndex + 1);
  }

  // ============ Act 2: "like" input ============

  private showLikeInput(): void {
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = '请输入: like';
    inputEl.style.cssText = `
      font-size: 22px; padding: 10px 20px; border: 2px solid #ffffff;
      border-radius: 8px; background: rgba(0,0,0,0.75); color: #ffffff;
      width: 240px; text-align: center; outline: none;
    `;

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = inputEl.value.trim().toLowerCase();
        domEl.destroy();
        inputEl.remove();
        promptText?.destroy();

        if (val === 'like') {
          useDramaStore.getState().recordChoice(2, 'like');
          this.slides = [
            { key: 'drama-act2-2-2-1', delay: 3000 }, { key: 'drama-act2-2-2-2', delay: 1000 },
            { key: 'drama-act2-2-2-3', delay: 2000 }, { key: 'drama-act2-2-2-4', delay: 1000 },
            { key: 'drama-act2-2-2-5', delay: 1000 }, { key: 'drama-act2-2-2-6', delay: 1000 },
            { key: 'drama-act2-2-2-7', delay: 1000 }, { key: 'drama-act2-2-2-8', delay: 3000 },
            { key: 'drama-act2-2-2-9', delay: 3000 }, { key: 'drama-act2-2-2-10', delay: 3000 },
            { key: 'drama-act2-2-3' }, { key: 'drama-act2-2-4' },
            { key: 'drama-act2-2-5' }, { key: 'drama-act2-2-6' },
          ];
        } else {
          useDramaStore.getState().recordChoice(2, 'other');
          this.slides = [
            { key: 'drama-act2-2-1-2' }, { key: 'drama-act2-2-3' },
            { key: 'drama-act2-2-4' }, { key: 'drama-act2-2-5' }, { key: 'drama-act2-2-6' },
          ];
        }
        this.mode = 'click';
        this.currentIndex = 0;
        this.showSlide(0);
      }
    });

    const domEl = this.add.dom(GAME_W / 2, GAME_H - 80, inputEl).setDepth(10);
    const promptText = this.add.text(GAME_W / 2, GAME_H - 130, '输入 "like" 解锁特殊剧情', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
  }

  // ============ Act 4: choices ============

  private showHelpChoice(): void {
    this.makeChoiceBtn(GAME_W / 2 - 140, GAME_H - 80, '有帮助', () => {
      useDramaStore.getState().recordChoice(4, 'help');
      this.slides = [
        { key: 'drama-act4-1' }, { key: 'drama-act4-2' }, { key: 'drama-act4-3' },
        { key: 'drama-act4-help-1' }, { key: 'drama-act4-help-2' },
      ];
      this.currentIndex = 2;
      this.showSlide(3);
    });

    this.makeChoiceBtn(GAME_W / 2 + 140, GAME_H - 80, '没帮助', () => {
      useDramaStore.getState().recordChoice(4, 'nohelp');
      this.slides = [
        { key: 'drama-act4-1' }, { key: 'drama-act4-2' }, { key: 'drama-act4-3' },
        { key: 'drama-act4-nohelp-1' }, { key: 'drama-act4-nohelp-2' }, { key: 'drama-act4-nohelp-3' },
        { key: 'drama-act4-nohelp-4' }, { key: 'drama-act4-nohelp-5' }, { key: 'drama-act4-nohelp-6' },
        { key: 'drama-act4-nohelp-7' },
      ];
      this.currentIndex = 2;
      this.showSlide(3);
    });
  }

  private makeChoiceBtn(x: number, y: number, label: string, cb: () => void): void {
    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(0x3355aa, 1);
    bg.fillRoundedRect(x - 100, y - 22, 200, 44, 8);
    this.add.text(x, y, label, { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5).setDepth(11);
    this.add.zone(x, y, 200, 44).setInteractive({ useHandCursor: true }).setDepth(12)
      .on('pointerdown', cb);
  }

  // ============ End ============

  private endAct(): void {
    if (this.actId === 0) {
      // Prologue done → go to Act 1
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('DramaScene', { actId: 1 });
      });
      return;
    }

    useDramaStore.getState().completeAct(this.actId);
    useDramaStore.getState().setIsPlaying(false);

    if (this.actId >= 7) {
      useDramaStore.getState().setCurrentAct(0);
      useHorrorStore.getState().unlock();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    } else {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('DramaScene', { actId: this.actId + 1 });
      });
    }
  }
}
