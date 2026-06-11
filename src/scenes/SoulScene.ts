import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../utils/Constants';
import { BGMManager } from '../systems/main/BGMManager';

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
  private butterflyDest: { x: number; y: number } | null = null;
  private butterflyFlying = false;
  private butterflyDone = false;
  private readonly FLY_TRIGGER = 80;
  private readonly FLY_PAUSE = 250;
  private readonly FLY_SPEED = 80;
  private bgm!: BGMManager;
  private readonly TRIGGER_POINT = { x: 1001, y: -1528 };
  private readonly TRIGGER_RADIUS = 50;
  private triggered = false;
  private triggerLocked = false;
  private autoWalking = false;
  private cloakFigure?: Phaser.GameObjects.Sprite;
  private settingsOpen = false;

  constructor() { super({ key: 'SoulScene' }); }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    this.bgm = new BGMManager(this);
    if (!this.sound.get('bgm-cat')?.isPlaying) {
      const startBGM = () => { if (!this.sound.get('bgm-cat')?.isPlaying) this.bgm.play('bgm-cat', 0.4); };
      this.input.once('pointerdown', startBGM);
      this.input.keyboard?.once('keydown', startBGM);
    }

    this.generateSoulTexture();
    this.soul = this.physics.add.sprite(this.ROOM_W / 2, 500, 'soul').setDepth(10).setScale(1.5);
    (this.soul.body as Phaser.Physics.Arcade.Body)?.setCircle(16);
    this.cameras.main.startFollow(this.soul, true, 0.1, 0.1);
    this.darkness = this.add.graphics().setDepth(5);

    for (let i = 0; i < 120; i++) {
      const dot = this.add.circle(Phaser.Math.Between(20, this.ROOM_W - 20), Phaser.Math.Between(20, this.ROOM_H - 20), Phaser.Math.Between(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.08, 0.35)).setDepth(3);
      this.tweens.add({ targets: dot, y: dot.y - Phaser.Math.Between(20, 50), alpha: 0, duration: Phaser.Math.Between(3000, 6000), repeat: -1, yoyo: true, delay: Phaser.Math.Between(0, 4000) });
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = { W: this.input.keyboard!.addKey('W'), A: this.input.keyboard!.addKey('A'), S: this.input.keyboard!.addKey('S'), D: this.input.keyboard!.addKey('D') };
    this.tweens.add({ targets: this.soul, scaleX: 1.6, scaleY: 1.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.input.keyboard!.addKey('F9').on('down', () => this.goNext());

    const hint = this.add.text(GAME_W / 2, 80, '我...这是在哪里？', { fontFamily: '"Microsoft YaHei", Arial', fontSize: '22px', color: '#aaaaff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20).setAlpha(0).setScrollFactor(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 2000, delay: 800 });
    this.tweens.add({ targets: hint, alpha: 0, duration: 2000, delay: 5000 });

    this.generateButterflyTexture();
    this.createButterfly(998, 343);
    this.butterflyDest = { x: 998, y: -1875 };

    // 标记圈
    this.add.graphics().setDepth(16).lineStyle(2, 0xff0000, 0.7).strokeCircle(this.butterflyDest.x, this.butterflyDest.y, 15).fillStyle(0xff0000, 0.15).fillCircle(this.butterflyDest.x, this.butterflyDest.y, 15);
    this.add.graphics().setDepth(16).lineStyle(2, 0xffff00, 0.7).strokeCircle(this.TRIGGER_POINT.x, this.TRIGGER_POINT.y, this.TRIGGER_RADIUS).fillStyle(0xffff00, 0.1).fillCircle(this.TRIGGER_POINT.x, this.TRIGGER_POINT.y, this.TRIGGER_RADIUS);

    this.generateCloakTexture();
    this.cloakFigure = this.add.sprite(1200, 600, 'cloak').setDepth(12).setScale(1.5).setVisible(false);

    // 编辑器按键
    this.setupEditorKeys();
    this.createSettingsPanel();
  }

  // ============ 编辑器 ============

  private setupEditorKeys(): void {
    let butterflyEdit = false;
    this.input.keyboard!.addKey('F2').on('down', () => {
      butterflyEdit = !butterflyEdit;
      if (!this.butterfly && butterflyEdit) {
        const h2 = this.add.text(GAME_W / 2, 100, '点击放置蝴蝶 | 再按F2退出', { fontFamily: 'monospace', fontSize: '13px', color: '#00ff00', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
        this.input.once('pointerdown', (p: Phaser.Input.Pointer) => { if (!butterflyEdit) return; h2.destroy(); this.createButterfly(p.worldX, p.worldY); butterflyEdit = false; console.log(`butterfly: x=${Math.round(p.worldX)}, y=${Math.round(p.worldY)}`); });
      } else if (this.butterfly && butterflyEdit) { this.butterfly.setTint(0x00ff00); this.butterfly.setInteractive({ draggable: true, useHandCursor: true }); }
      else if (this.butterfly) { this.butterfly.setTint(0xffffff); this.butterfly.disableInteractive(); console.log(`butterfly: x=${Math.round(this.butterfly.x)}, y=${Math.round(this.butterfly.y)}`); }
    });

    let destEdit = false;
    let destCircle: Phaser.GameObjects.Graphics | null = null;
    this.input.keyboard!.addKey('F4').on('down', () => {
      destEdit = !destEdit;
      if (destEdit) {
        const h4 = this.add.text(GAME_W / 2, 140, '点击设置蝴蝶停止点 | 再按F4退出', { fontFamily: 'monospace', fontSize: '13px', color: '#ff8800', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
        this.input.once('pointerdown', (p: Phaser.Input.Pointer) => { if (!destEdit) return; h4.destroy(); this.butterflyDest = { x: p.worldX, y: p.worldY }; this.butterflyFlying = false; this.butterflyDone = false; destEdit = false; if (destCircle) destCircle.destroy(); destCircle = this.add.graphics().setDepth(16); destCircle.lineStyle(2, 0xff0000, 0.7).strokeCircle(p.worldX, p.worldY, 15).fillStyle(0xff0000, 0.15).fillCircle(p.worldX, p.worldY, 15); console.log(`蝴蝶停止点: x=${Math.round(p.worldX)}, y=${Math.round(p.worldY)}`); });
      }
    });

    let cloakEdit = false;
    this.input.keyboard!.addKey('F3').on('down', () => {
      cloakEdit = !cloakEdit;
      if (!this.cloakFigure?.visible && cloakEdit) {
        const h3 = this.add.text(GAME_W / 2, 120, '点击放置斗篷人 | 再按F3退出', { fontFamily: 'monospace', fontSize: '13px', color: '#ffcc00', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
        this.input.once('pointerdown', (p: Phaser.Input.Pointer) => { if (!cloakEdit) return; h3.destroy(); this.cloakFigure!.setPosition(p.worldX, p.worldY).setVisible(true); cloakEdit = false; console.log(`cloak: x=${Math.round(p.worldX)}, y=${Math.round(p.worldY)}`); });
      } else if (this.cloakFigure?.visible && cloakEdit) { this.cloakFigure.setTint(0x00ff00); this.cloakFigure.setInteractive({ draggable: true, useHandCursor: true }); }
      else if (this.cloakFigure?.visible) { this.cloakFigure.setTint(0xffffff); this.cloakFigure.disableInteractive(); console.log(`cloak: x=${Math.round(this.cloakFigure.x)}, y=${Math.round(this.cloakFigure.y)}`); }
    });

    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dx: number, dy: number) => {
      if (obj === this.butterfly) { this.butterfly!.x = dx; this.butterfly!.y = dy; }
      if (obj === this.cloakFigure) { this.cloakFigure!.x = dx; this.cloakFigure!.y = dy; }
    });
  }

  // ============ 纹理 ============

  private createButterfly(x: number, y: number): void {
    if (this.butterfly) this.butterfly.destroy();
    this.butterfly = this.add.image(x, y, 'butterfly').setDepth(15).setScale(1.2);
    this.tweens.add({ targets: this.butterfly, y: y - 8, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    gfx.fillStyle(0x2a1a3e, 1); gfx.fillTriangle(w/2, 18, 10, h, w-10, h);
    gfx.fillEllipse(w/2, 14, 20, 22);
    gfx.fillStyle(0x1a0a2e, 1); gfx.fillEllipse(w/2, 16, 12, 14);
    gfx.fillStyle(0x8866ff, 0.5); gfx.fillCircle(w/2-4, 14, 2); gfx.fillCircle(w/2+4, 14, 2);
    gfx.generateTexture('cloak', w, h); gfx.destroy();
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

  // ============ 更新 ============

  update(_time: number, delta: number): void {
    // ---- 触发点检测 ----
    if (!this.triggered && this.butterflyDest) {
      const d = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, this.TRIGGER_POINT.x, this.TRIGGER_POINT.y);
      if (d < this.TRIGGER_RADIUS) {
        this.triggered = true;
        this.autoWalking = true;
      }
    }

    // 自动走到触发点中心
    if (this.autoWalking) {
      const dx = this.TRIGGER_POINT.x - this.soul.x;
      const dy = this.TRIGGER_POINT.y - this.soul.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        this.autoWalking = false;
        this.triggerLocked = true;
        this.butterflyFlying = true;
        if (this.butterfly) this.tweens.killTweensOf(this.butterfly);
        this.soul.setVelocity(0, 0);
      } else {
        this.soul.setVelocity((dx / dist) * this.speed * 0.6, (dy / dist) * this.speed * 0.6);
      }
      this.renderDarkness();
      return;
    }

    // 锁定期间 — 蝴蝶飞向终点
    if (this.triggerLocked) {
      if (this.butterfly && this.butterflyDest && !this.butterflyDone) {
        const dx2 = this.butterflyDest.x - this.butterfly.x;
        const dy2 = this.butterflyDest.y - this.butterfly.y;
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d < 10) { this.butterflyDone = true; this.triggerLocked = false; }
        else { const step = Math.min(this.FLY_SPEED * delta / 1000, d); this.butterfly.x += (dx2 / d) * step; this.butterfly.y += (dy2 / d) * step; }
      }
      this.renderDarkness();
      return;
    }

    // ---- 正常移动 ----
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown)   dx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown)  dx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown)     dy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown)   dy = 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this.soul.setVelocity(dx * this.speed, dy * this.speed);

    // 蝴蝶靠近时飞向终点
    if (this.butterfly && this.butterflyDest && !this.butterflyDone) {
      const distToSoul = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, this.butterfly.x, this.butterfly.y);
      if (distToSoul < this.FLY_TRIGGER) { if (!this.butterflyFlying) this.tweens.killTweensOf(this.butterfly); this.butterflyFlying = true; }
      else if (distToSoul > this.FLY_PAUSE) { this.butterflyFlying = false; }
      if (this.butterflyFlying) {
        const dx2 = this.butterflyDest.x - this.butterfly.x;
        const dy2 = this.butterflyDest.y - this.butterfly.y;
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d < 10) { this.butterflyDone = true; this.butterflyFlying = false; }
        else { const step = Math.min(this.FLY_SPEED * delta / 1000, d); this.butterfly.x += (dx2 / d) * step; this.butterfly.y += (dy2 / d) * step; }
      }
    }

    this.renderDarkness();
  }

  private renderDarkness(): void {
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

  // ============ 设置面板 ============

  private createSettingsPanel(): void {
    const gear = this.add.text(GAME_W - 40, 15, '⚙', { fontSize: '22px' }).setOrigin(0.5, 0).setDepth(200).setScrollFactor(0).setInteractive({ useHandCursor: true });
    gear.on('pointerdown', () => {
      if (this.settingsOpen) return; this.settingsOpen = true;
      const parts: Phaser.GameObjects.GameObject[] = [];
      const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.3).setDepth(200).setScrollFactor(0).setInteractive(); parts.push(mask);
      const bx = GAME_W - 160, by = 50;
      const box = this.add.graphics().setDepth(201).setScrollFactor(0); box.fillStyle(0x1a1a2e, 0.95); box.fillRoundedRect(bx, by, 140, 120, 8); box.lineStyle(1, 0x444466, 1); box.strokeRoundedRect(bx, by, 140, 120, 8); parts.push(box);
      parts.push(this.add.text(bx + 70, by + 12, '🔊 音乐', { fontFamily: '"Microsoft YaHei", Arial', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5, 0).setDepth(202).setScrollFactor(0));
      let volValue = this.bgm.currentVolume;
      const volBg = this.add.graphics().setDepth(202).setScrollFactor(0); volBg.fillStyle(0x333355, 1); volBg.fillRoundedRect(bx + 15, by + 40, 110, 8, 4); parts.push(volBg);
      const volFill = this.add.graphics().setDepth(203).setScrollFactor(0);
      const updateVolBar = () => { volFill.clear(); volFill.fillStyle(0x4a90d9, 1); volFill.fillRoundedRect(bx + 15, by + 40, 110 * volValue, 8, 4); }; updateVolBar();
      this.add.zone(bx + 70, by + 44, 110, 12).setDepth(204).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => { volValue = Phaser.Math.Clamp((p.x - bx - 15) / 110, 0, 1); updateVolBar(); this.bgm.setVolume(volValue); });
      const isOn = this.bgm.isPlaying;
      const toggleBtn = this.add.text(bx + 45, by + 65, isOn ? '🔊 开' : '🔇 关', { fontFamily: '"Microsoft YaHei", Arial', fontSize: '11px', color: '#ffffff', backgroundColor: isOn ? '#335533' : '#553333', padding: { x: 8, y: 4 } }).setDepth(204).setScrollFactor(0).setInteractive({ useHandCursor: true }); parts.push(toggleBtn);
      toggleBtn.on('pointerdown', () => { if (this.bgm.isPlaying) { this.bgm.stop(); toggleBtn.setText('🔇 关'); toggleBtn.setStyle({ backgroundColor: '#553333' }); } else { this.bgm.play('bgm-cat', volValue); toggleBtn.setText('🔊 开'); toggleBtn.setStyle({ backgroundColor: '#335533' }); } });
      const closeBtn = this.add.text(bx + 70, by + 98, '关闭', { fontFamily: '"Microsoft YaHei", Arial', fontSize: '10px', color: '#888888' }).setOrigin(0.5).setDepth(204).setScrollFactor(0).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerdown', () => { parts.forEach(p => p.destroy()); this.settingsOpen = false; });
      mask.on('pointerdown', () => { parts.forEach(p => p.destroy()); this.settingsOpen = false; });
    });
  }

  private goNext(): void { this.cameras.main.fadeOut(1500, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('WalkScene'); }); }
}
