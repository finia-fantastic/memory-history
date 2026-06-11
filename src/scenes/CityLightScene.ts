import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../utils/Constants';
import { CHAPTER1_SLIDES } from '../story/chapter1';
import { BGMManager } from '../systems/main/BGMManager';

const INTRO_SLIDES = CHAPTER1_SLIDES;

export class CityLightScene extends Phaser.Scene {
  private slideIndex = 0;
  private stepIndex = 0;
  private currentImg?: Phaser.GameObjects.Image;
  private subtitleObjects: Phaser.GameObjects.Text[] = [];
  private editMode = false;
  private editLabel!: Phaser.GameObjects.Text;
  private alignLine!: Phaser.GameObjects.Graphics;
  private allSubtitles: { text: string; x: number; y: number }[] = []; // 跨图片对齐参考
  private devSubtitles: Phaser.GameObjects.Text[] = []; // 开发者临时字幕

  constructor() { super({ key: 'CityLightScene' }); }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 首帧点击后播放BGM（浏览器要求用户交互才能播放音频）
    const startBGM = () => {
      if (!this.sound.get('bgm-cat')?.isPlaying) {
        new BGMManager(this).play('bgm-cat', 0.4);
      }
    };
    this.input.once('pointerdown', startBGM);
    this.input.keyboard?.once('keydown', startBGM);

    this.alignLine = this.add.graphics().setDepth(65).setVisible(false);

    // 加载第一张背景图
    const s0 = INTRO_SLIDES[0];
    if (s0 && this.textures.exists(s0.key)) {
      this.currentImg = this.add.image(GAME_W / 2, GAME_H / 2, s0.key);
      this.currentImg.setScale(Math.max(GAME_W / this.currentImg.width, GAME_H / this.currentImg.height)).setDepth(0);
    }

    this.editLabel = this.add.text(GAME_W / 2, GAME_H - 20, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.8)', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.showCurrentStep();

    // F2 编辑模式
    this.input.keyboard!.addKey('F2').on('down', () => {
      this.editMode = !this.editMode;
      this.editLabel.setVisible(this.editMode);
      if (!this.editMode) this.alignLine.setVisible(false);
      this.editLabel.setText(this.editMode ? '✏ 编辑 | 添加当前步字幕 | 红线=对齐 | F2退出 | F11存控制台' : '');
    });

    // F11 保存字幕数据到控制台
    this.input.keyboard!.addKey('F11').on('down', () => {
      console.clear();
      console.log('=== 复制以下替换 INTRO_SLIDES ===');
      console.log(JSON.stringify(INTRO_SLIDES.map(s => ({
        key: s.key, name: s.name,
        steps: s.steps,
      })), null, 2));
    });

    // 鼠标移动 -> 对齐线
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.editMode) { this.alignLine.setVisible(false); return; }
      const snapX = this.findSnapX(p.x);
      if (snapX !== null) {
        this.alignLine.setVisible(true);
        this.alignLine.clear();
        this.alignLine.lineStyle(1, 0xff0000, 0.6);
        this.alignLine.lineBetween(snapX, 0, snapX, GAME_H);
      } else {
        this.alignLine.setVisible(false);
      }
    });

    // 点击：编辑=加字幕，普通=下一步
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.editMode) {
        const snapX = this.findSnapX(p.x);
        this.addDevSubtitle(snapX ?? p.x, p.y);
      } else {
        this.nextStep();
      }
    });

    // F9 跳过全部
    this.input.keyboard!.addKey('F9').on('down', () => this.goToRoom());
  }

  // ============ 步进系统 ============

  private showCurrentStep(): void {
    const slide = INTRO_SLIDES[this.slideIndex];
    if (!slide) { this.goToRoom(); return; }

    // 灵魂场景
    if (slide.key === '__soul__') {
      console.log('>>> 启动灵魂场景 <<<');
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => { this.scene.start('SoulScene'); });
      return;
    }

    if (this.stepIndex >= slide.steps.length) {
      this.nextSlide();
      return;
    }

    // 显示当前步的字幕
    this.subtitleObjects.forEach(t => t.destroy());
    this.subtitleObjects = [];
    this.devSubtitles.forEach(t => t.destroy());
    this.devSubtitles = [];

    slide.steps[this.stepIndex].forEach(s => {
      const text = this.add.text(s.x, s.y, s.text, {
        fontFamily: '"Microsoft YaHei", Arial', fontSize: '22px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(60);
      this.subtitleObjects.push(text);
    });

    // 更新进度提示
    const totalSteps = INTRO_SLIDES.reduce((sum, s) => sum + s.steps.length, 0);
    let currentGlobalStep = 0;
    for (let i = 0; i < this.slideIndex; i++) currentGlobalStep += INTRO_SLIDES[i].steps.length;
    currentGlobalStep += this.stepIndex + 1;

    this.children.getAll().filter(c => c.getData('hint')).forEach(c => c.destroy());
    const hint = this.add.text(GAME_W / 2, 30, `[${currentGlobalStep}/${totalSteps}] ${slide.name}`, {
      fontFamily: '"Microsoft YaHei", Arial', fontSize: '12px', color: '#aaaaaa',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(50);
    hint.setData('hint', true);
  }

  private nextStep(): void {
    this.stepIndex++;
    const slide = INTRO_SLIDES[this.slideIndex];
    if (this.stepIndex >= slide.steps.length) {
      this.stepIndex = 0;
      this.nextSlide();
    } else {
      this.showCurrentStep();
    }
  }

  private nextSlide(): void {
    this.stepIndex = 0;
    if (this.currentImg) this.currentImg.destroy();
    this.slideIndex++;

    const slide = INTRO_SLIDES[this.slideIndex];
    if (!slide) { this.goToRoom(); return; }

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cameras.main.fadeIn(400, 0, 0, 0);
      if (this.currentImg) this.currentImg.destroy();
      if (slide.key && this.textures.exists(slide.key)) {
        this.currentImg = this.add.image(GAME_W / 2, GAME_H / 2, slide.key);
        this.currentImg.setScale(Math.max(GAME_W / this.currentImg.width, GAME_H / this.currentImg.height)).setDepth(0);
      } else {
        this.currentImg = undefined;
        this.cameras.main.setBackgroundColor('#000000');
      }
      this.showCurrentStep();
    });
  }

  // ============ 字幕编辑 ============

  private readonly SNAP_THRESHOLD = 25;

  private findSnapX(x: number): number | null {
    for (const s of this.allSubtitles) {
      if (Math.abs(x - s.x) < this.SNAP_THRESHOLD) return s.x;
    }
    return null;
  }

  private addDevSubtitle(x: number, y: number): void {
    const content = prompt('输入字幕文字：');
    if (!content) return;

    const text = this.add.text(x, y, content, {
      fontFamily: '"Microsoft YaHei", Arial', fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4, wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(60);

    this.devSubtitles.push(text);
    this.allSubtitles.push({ text: content, x: Math.round(x), y: Math.round(y) });

    text.setInteractive({ draggable: true, useHandCursor: true });
    text.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => { text.x = dx; text.y = dy; });
    text.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) text.destroy(); });

    console.log(`[${INTRO_SLIDES[this.slideIndex]?.name} Step${this.stepIndex}] "${content}" at (${Math.round(x)}, ${Math.round(y)})`);
  }

  // ============ 视频播放 ============

  private playVideo(): void {
    // 隐藏字幕和UI
    this.subtitleObjects.forEach(t => t.destroy());
    this.subtitleObjects = [];

    const video = document.createElement('video');
    video.src = 'assets/main/drama/prologue/作为鬼魂到了异世界.mp4';
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#000;';
    video.autoplay = true;
    video.muted = false;

    // 将视频添加到游戏容器
    const container = document.getElementById('game-container');
    if (container) container.appendChild(video);

    // 视频结束 → 进入房间
    video.onended = () => {
      video.remove();
      this.goToRoom();
    };

    // 点击跳过视频
    video.onclick = () => {
      video.remove();
      this.goToRoom();
    };

    // F9 跳过
    this.input.keyboard!.addKey('F9').on('down', () => {
      video.remove();
      this.goToRoom();
    });
  }

  // ============ 通用 ============

  private goToRoom(): void {
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('WalkScene'); });
  }
}
