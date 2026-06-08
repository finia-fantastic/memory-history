import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../utils/Constants';

export class SoulScene extends Phaser.Scene {
  private soul!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private speed = 100;
  private lightRadius = 130;
  private darkness!: Phaser.GameObjects.Graphics;
  private readonly ROOM_W = 2000;
  private readonly ROOM_H = 5000;
  private butterfly?: Phaser.GameObjects.Image;

  constructor() { super({ key: 'SoulScene' }); }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    this.generateSoulTexture();

    this.physics.world.setBounds(0, 0, this.ROOM_W, this.ROOM_H);

    this.soul = this.physics.add.sprite(this.ROOM_W / 2, 500, 'soul').setDepth(10).setScale(1.5);
    this.soul.setCollideWorldBounds(true);
    (this.soul.body as Phaser.Physics.Arcade.Body)?.setCircle(16);

    this.cameras.main.setBounds(0, 0, this.ROOM_W, this.ROOM_H);
    this.cameras.main.startFollow(this.soul, true, 0.1, 0.1);

    this.darkness = this.add.graphics().setDepth(5); // 不用setScrollFactor，跟随世界移动

    // 漂浮粒子
    for (let i = 0; i < 60; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(20, this.ROOM_W - 20),
        Phaser.Math.Between(20, this.ROOM_H - 20),
        Phaser.Math.Between(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4),
      ).setDepth(3);
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(20, 50), alpha: 0,
        duration: Phaser.Math.Between(3000, 6000), repeat: -1, yoyo: true,
        delay: Phaser.Math.Between(0, 4000),
      });
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = { W: this.input.keyboard!.addKey('W'), A: this.input.keyboard!.addKey('A'), S: this.input.keyboard!.addKey('S'), D: this.input.keyboard!.addKey('D') };

    this.tweens.add({ targets: this.soul, scaleX: 1.6, scaleY: 1.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.input.keyboard!.addKey('F9').on('down', () => this.goNext());

    // 网格参照（覆盖整个房间高度）
    const gridGfx = this.add.graphics().setDepth(1).setAlpha(0.04);
    gridGfx.lineStyle(1, 0xffffff, 1);
    for (let x = 0; x < this.ROOM_W; x += 100) gridGfx.lineBetween(x, 0, x, this.ROOM_H);
    for (let y = 0; y < this.ROOM_H; y += 100) gridGfx.lineBetween(0, y, this.ROOM_W, y);

    // 漂浮粒子覆盖整个房间
    for (let i = 0; i < 120; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(20, this.ROOM_W - 20),
        Phaser.Math.Between(20, this.ROOM_H - 20),
        Phaser.Math.Between(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.08, 0.35),
      ).setDepth(3);
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(20, 50), alpha: 0,
        duration: Phaser.Math.Between(3000, 6000), repeat: -1, yoyo: true,
        delay: Phaser.Math.Between(0, 4000),
      });
    }

    // 字幕
    const hint = this.add.text(GAME_W / 2, 80, '我...这是在哪里？', {
      fontFamily: '"Microsoft YaHei", Arial', fontSize: '22px', color: '#aaaaff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAlpha(0).setScrollFactor(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 2000, delay: 800 });
    this.tweens.add({ targets: hint, alpha: 0, duration: 2000, delay: 5000 });

    // ★ 蝴蝶
    this.generateButterflyTexture();
    this.createButterfly(998, 343);

    // ★ 斗篷人
    this.generateCloakTexture();
    this.cloakFigure = this.add.sprite(1200, 600, 'cloak').setDepth(12).setScale(1.5);
    this.cloakFigure.setVisible(false); // 初始隐藏，F3放置后出现

    // F2 蝴蝶编辑
    let butterflyEdit = false;
    this.input.keyboard!.addKey('F2').on('down', () => {
      butterflyEdit = !butterflyEdit;
      if (!this.butterfly && butterflyEdit) {
        const h2 = this.add.text(GAME_W / 2, 100, '点击放置蝴蝶 | 再按F2退出', {
          fontFamily: 'monospace', fontSize: '13px', color: '#00ff00',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
        this.input.once('pointerdown', (p: Phaser.Input.Pointer) => {
          if (!butterflyEdit) return;
          h2.destroy();
          this.createButterfly(p.worldX, p.worldY);
          butterflyEdit = false;
          console.log(`butterfly: x=${Math.round(p.worldX)}, y=${Math.round(p.worldY)}`);
        });
      } else if (this.butterfly && butterflyEdit) {
        this.butterfly.setTint(0x00ff00);
        this.butterfly.setInteractive({ draggable: true, useHandCursor: true });
      } else if (this.butterfly) {
        this.butterfly.setTint(0xffffff);
        this.butterfly.disableInteractive();
        console.log(`butterfly: x=${Math.round(this.butterfly.x)}, y=${Math.round(this.butterfly.y)}`);
      }
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dx: number, dy: number) => {
      if (obj === this.butterfly) { this.butterfly!.x = dx; this.butterfly!.y = dy; }
      if (obj === this.cloakFigure) { this.cloakFigure!.x = dx; this.cloakFigure!.y = dy; }
    });

    // F3 斗篷人放置
    let cloakEdit = false;
    this.input.keyboard!.addKey('F3').on('down', () => {
      cloakEdit = !cloakEdit;
      if (!this.cloakFigure?.visible && cloakEdit) {
        const h3 = this.add.text(GAME_W / 2, 120, '点击放置斗篷人 | 再按F3退出', {
          fontFamily: 'monospace', fontSize: '13px', color: '#ffcc00',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
        this.input.once('pointerdown', (p: Phaser.Input.Pointer) => {
          if (!cloakEdit) return;
          h3.destroy();
          this.cloakFigure!.setPosition(p.worldX, p.worldY).setVisible(true);
          cloakEdit = false;
          console.log(`cloak: x=${Math.round(p.worldX)}, y=${Math.round(p.worldY)}`);
        });
      } else if (this.cloakFigure?.visible && cloakEdit) {
        this.cloakFigure.setTint(0x00ff00);
        this.cloakFigure.setInteractive({ draggable: true, useHandCursor: true });
      } else if (this.cloakFigure?.visible) {
        this.cloakFigure.setTint(0xffffff);
        this.cloakFigure.disableInteractive();
        console.log(`cloak: x=${Math.round(this.cloakFigure.x)}, y=${Math.round(this.cloakFigure.y)}`);
      }
    });
  }

  private cloakFigure?: Phaser.GameObjects.Sprite;

  private createButterfly(x: number, y: number): void {
    if (this.butterfly) this.butterfly.destroy();
    this.butterfly = this.add.image(x, y, 'butterfly').setDepth(15).setScale(1.2);
    this.tweens.add({ targets: this.butterfly, y: y - 15, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private generateButterflyTexture(): void {
    if (this.textures.exists('butterfly')) return;
    const size = 48, gfx = this.add.graphics();
    gfx.fillStyle(0x4488ff, 0.8); gfx.fillEllipse(size/2-10, size/2-4, 16, 20);
    gfx.fillEllipse(size/2+10, size/2-4, 16, 20);
    gfx.fillStyle(0x88bbff, 0.6); gfx.fillEllipse(size/2-10, size/2+4, 10, 14);
    gfx.fillEllipse(size/2+10, size/2+4, 10, 14);
    gfx.fillStyle(0x224488, 1); gfx.fillRect(size/2-2, size/2-10, 4, 24);
    gfx.fillStyle(0xaaccff, 0.3); gfx.fillCircle(size/2, size/2, 20);
    gfx.generateTexture('butterfly', size, size); gfx.destroy();
  }

  private generateCloakTexture(): void {
    if (this.textures.exists('cloak')) return;
    const w = 48, h = 64, gfx = this.add.graphics();
    // 斗篷身体
    gfx.fillStyle(0x2a1a3e, 1);
    gfx.fillTriangle(w/2, 18, 10, h, w-10, h);
    // 头罩
    gfx.fillStyle(0x2a1a3e, 1);
    gfx.fillEllipse(w/2, 14, 20, 22);
    // 脸部阴影
    gfx.fillStyle(0x1a0a2e, 1);
    gfx.fillEllipse(w/2, 16, 12, 14);
    // 眼睛微微发光
    gfx.fillStyle(0x8866ff, 0.5);
    gfx.fillCircle(w/2-4, 14, 2);
    gfx.fillCircle(w/2+4, 14, 2);
    gfx.generateTexture('cloak', w, h);
    gfx.destroy();
  }

  private generateSoulTexture(): void {
    if (this.textures.exists('soul')) return;
    const size = 64, gfx = this.add.graphics();
    gfx.fillStyle(0x6666ff, 0.1); gfx.fillCircle(32, 32, 32);
    gfx.fillStyle(0x6666ff, 0.15); gfx.fillCircle(32, 32, 26);
    gfx.fillStyle(0x8888ff, 0.25); gfx.fillCircle(32, 32, 20);
    gfx.fillStyle(0xaaaaff, 0.4); gfx.fillCircle(32, 32, 14);
    gfx.fillStyle(0xccccff, 0.6); gfx.fillCircle(32, 32, 8);
    gfx.fillStyle(0xffffff, 0.8); gfx.fillCircle(32, 32, 4);
    gfx.fillStyle(0x1a1a3e, 1); gfx.fillCircle(27, 29, 3); gfx.fillCircle(37, 29, 3);
    gfx.generateTexture('soul', size, size); gfx.destroy();
  }

  update(_time: number, delta: number): void {
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown)   dx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown)  dx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown)     dy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown)   dy = 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this.soul.setVelocity(dx * this.speed, dy * this.speed);

    // 左右循环
    if (this.soul.x > this.ROOM_W + 20) this.soul.x = -20;
    if (this.soul.x < -20) this.soul.x = this.ROOM_W + 20;

    // 黑暗遮罩 — 世界坐标，跟随摄像机
    this.darkness.clear();
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;
    const cx = cam.scrollX, cy = cam.scrollY;

    this.darkness.fillStyle(0x000000, 0.92);
    this.darkness.fillRect(cx - 100, cy - 100, w + 200, h + 200);

    const sx = this.soul.x, sy = this.soul.y;
    for (let i = 12; i >= 0; i--) {
      const t = i / 12, r = this.lightRadius * t, a = 0.92 * (1-t) * (1-t);
      this.darkness.fillStyle(0x000000, a); this.darkness.fillCircle(sx, sy, r);
    }
  }

  private goNext(): void {
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('WalkScene'); });
  }
}
