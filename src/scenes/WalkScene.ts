import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { GAME_W, GAME_H } from '../utils/Constants';

export class WalkScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private speed = 150;
  private colliderGroup!: Phaser.Physics.Arcade.StaticGroup;
  private colliderDefs: { name: string; x: number; y: number; w: number; h: number; obj?: Phaser.GameObjects.Rectangle }[] = [];
  private dialogOpen = false;

  // ---- 行走图 ----
  private readonly DIR_ROWS: Record<string, number> = { down: 0, left: 2, right: 1, up: 3 };
  private playerDir = 'down';
  private frameW = 0; private frameH = 0;
  private animFrame = 1; private animTimer = 0;
  private readonly FRAME_DURATION = 140;
  private wasMoving = false;

  // ---- 编辑器 ----
  private editMode = false;
  private editGfx!: Phaser.GameObjects.Graphics;
  private editLabel!: Phaser.GameObjects.Text;
  private dragStart: { x: number; y: number } | null = null;
  private dragRect: Phaser.GameObjects.Rectangle | null = null;

  constructor() { super({ key: 'WalkScene' }); }

  create(): void {
    useGameStore.getState().setPhase('game');
    this.cameras.main.setBackgroundColor('#000000');

    // --- 房间背景 ---
    if (this.textures.exists('room-bg')) {
      const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'room-bg');
      bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height)).setDepth(0);
    }

    // --- 切割行走图 ---
    this.createCatFrames();

    // --- 玩家 ---
    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'cat-frame-0-1')
      .setDepth(10).setScale(0.5);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(this.frameW * 0.5, this.frameH * 0.4);
    this.player.body!.setOffset(this.frameW * 0.25, this.frameH * 0.5);

    // --- 碰撞 ---
    this.setupCollisions();
    this.physics.add.collider(this.player, this.colliderGroup);

    // --- 输入 ---
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'), A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'), D: this.input.keyboard!.addKey('D'),
    };

    // --- 编辑器 ---
    this.editGfx = this.add.graphics().setDepth(55);
    this.editLabel = this.add.text(GAME_W / 2, GAME_H - 16, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.8)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(56).setVisible(false);

    this.input.keyboard!.addKey('F2').on('down', () => {
      this.editMode = !this.editMode;
      this.editLabel.setVisible(this.editMode);
      if (!this.editMode) {
        this.dragStart = null;
        this.dragRect?.destroy();
        this.dragRect = null;
        this.editGfx.clear();
      }
      this.updateEditHint();
    });

    // --- F10 一键保存碰撞数据（F11被浏览器占用了） ---
    this.input.keyboard!.addKey('F10').on('down', (e: KeyboardEvent) => {
      e.preventDefault();
      this.saveCollisionData();
    });

    // --- 鼠标：编辑模式拖拽 / 普通模式点门 ---
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.editMode) {
        // 右键删除
        if (p.rightButtonDown()) {
          this.removeColliderAt(p.x, p.y);
          return;
        }
        // 左键开始拖拽
        this.dragStart = { x: p.x, y: p.y };
        this.dragRect = this.add.rectangle(p.x, p.y, 0, 0, 0x00ff00, 0.3)
          .setOrigin(0, 0).setDepth(54).setStrokeStyle(1, 0x00ff00);
      } else {
        this.tryEnterDoor();
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.editMode || !this.dragStart || !this.dragRect) return;
      const x = Math.min(this.dragStart.x, p.x);
      const y = Math.min(this.dragStart.y, p.y);
      const w = Math.abs(p.x - this.dragStart.x);
      const h = Math.abs(p.y - this.dragStart.y);
      this.dragRect.setPosition(x, y).setSize(w, h);
    });

    this.input.on('pointerup', (_p: Phaser.Input.Pointer) => {
      if (!this.editMode || !this.dragStart || !this.dragRect) return;
      const w = this.dragRect.width;
      const h = this.dragRect.height;
      if (w > 4 && h > 4) {
        this.addCollider(this.dragRect.x, this.dragRect.y, w, h);
      }
      this.dragRect.destroy();
      this.dragRect = null;
      this.dragStart = null;
      this.updateEditHint();
    });

    // --- 门 ---
    this.createDoorHint();

    // --- 提示 ---
    this.add.text(GAME_W / 2, 26, '移动:WASD | 进门:E | 碰撞:F1 | 编辑:F2 | 右键删除 | F10保存', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '13px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 14, y: 6 },
    }).setOrigin(0.5, 0).setDepth(100);

    // --- F1 可视化 ---
    const debugGfx = this.add.graphics().setDepth(50);
    let showDebug = false;
    const redraw = () => {
      debugGfx.clear();
      if (!showDebug) return;
      for (const col of this.colliderGroup.getChildren() as Phaser.GameObjects.Rectangle[]) {
        debugGfx.fillStyle(0xff0000, 0.3);
        debugGfx.fillRect(col.x, col.y, col.width, col.height);
        debugGfx.lineStyle(1, 0xff0000, 0.7);
        debugGfx.strokeRect(col.x, col.y, col.width, col.height);
      }
    };
    this.time.delayedCall(200, redraw);
    this.input.keyboard!.addKey('F1').on('down', () => { showDebug = !showDebug; showDebug ? redraw() : debugGfx.clear(); });

    // --- E 键进门 ---
    this.input.keyboard!.addKey('E').on('down', () => this.tryEnterDoor());
  }

  // ==================== 碰撞编辑器 ====================

  private addCollider(x: number, y: number, w: number, h: number): void {
    // 询问命名
    const name = prompt('给这个碰撞体起个名字（如：桌子、床、椅子）：', '物体') || '未命名';
    const rect = this.add.rectangle(x, y, w, h).setOrigin(0, 0).setVisible(false);
    this.colliderGroup.add(rect);
    this.colliderDefs.push({ name, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), obj: rect });
    console.log(`{ name: '${name}', x: ${Math.round(x)}, y: ${Math.round(y)}, w: ${Math.round(w)}, h: ${Math.round(h)} },`);
  }

  private removeColliderAt(mx: number, my: number): void {
    for (let i = this.colliderDefs.length - 1; i >= 0; i--) {
      const def = this.colliderDefs[i];
      if (mx >= def.x && mx <= def.x + def.w && my >= def.y && my <= def.y + def.h) {
        def.obj?.destroy();
        this.colliderDefs.splice(i, 1);
        this.updateEditHint();
        console.log(`已删除: ${def.name}`);
        this.printAllRects();
        return;
      }
    }
  }

  private updateEditHint(): void {
    if (!this.editMode) return;
    const count = this.colliderDefs.length;
    this.editLabel.setText(`✏ 编辑模式 | 拖拽添加碰撞体 | 右键删除 | 当前 ${count} 个 | F10保存`);
    this.printAllRects();
  }

  private printAllRects(): void {
    console.clear();
    console.log('=== 碰撞体定义 ===');
    for (const d of this.colliderDefs) {
      console.log(`{ name: '${d.name}', x: ${Math.round(d.x)}, y: ${Math.round(d.y)}, w: ${Math.round(d.w)}, h: ${Math.round(d.h)} },`);
    }
  }

  private saveCollisionData(): void {
    if (this.colliderDefs.length === 0) { alert('无碰撞数据'); return; }

    const lines = this.colliderDefs.map(
      d => `      { name: '${d.name}', x: ${Math.round(d.x)}, y: ${Math.round(d.y)}, w: ${Math.round(d.w)}, h: ${Math.round(d.h)} },`
    );
    const code = lines.join('\n');

    navigator.clipboard.writeText(code).then(() => {
      this.showToast('✅ 已复制！粘贴给我写入代码');
    }).catch(() => {});

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'collision-data.txt'; a.click();
    URL.revokeObjectURL(url);
    this.printAllRects();
  }

  private showToast(msg: string): void {
    const t = this.add.text(GAME_W / 2, 50, msg, {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '15px', color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.85)', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: t, alpha: 0, y: 30, delay: 2000, duration: 800, onComplete: () => t.destroy() });
  }

  // ==================== 碰撞体设置 ====================

  private setupCollisions(): void {
    this.colliderDefs = [
      { name: '椅子', x: 309, y: 383, w: 49, h: 31 },
      { name: '墙', x: 60, y: 307, w: 1168, h: 24 },
      { name: '墙', x: 1204, y: 318, w: 33, h: 336 },
      { name: '墙', x: 720, y: 625, w: 520, h: 37 },
      { name: '墙', x: 714, y: 629, w: 47, h: 82 },
      { name: '墙', x: 43, y: 306, w: 30, h: 345 },
      { name: '墙', x: 39, y: 625, w: 528, h: 44 },
      { name: '墙', x: 533, y: 632, w: 31, h: 79 },
      { name: '床', x: 829, y: 317, w: 159, h: 163 },
      { name: '床头柜', x: 997, y: 331, w: 69, h: 50 },
      { name: '书柜', x: 1101, y: 318, w: 100, h: 64 },
      { name: '手办柜', x: 76, y: 585, w: 253, h: 49 },
      { name: '奖杯', x: 328, y: 588, w: 54, h: 46 },
      { name: '盆栽', x: 1147, y: 589, w: 54, h: 39 },
      { name: '书桌', x: 231, y: 329, w: 196, h: 36 },
      { name: '盆栽2', x: 425, y: 326, w: 69, h: 39 },
      { name: '衣柜', x: 82, y: 327, w: 115, h: 54 },
    ];

    this.colliderGroup = this.physics.add.staticGroup();
    this.colliderDefs.forEach((def) => {
      const wall = this.add.rectangle(def.x, def.y, def.w, def.h).setOrigin(0, 0).setVisible(false);
      def.obj = wall;
      this.colliderGroup.add(wall);
    });
  }

  // ==================== 行走图切割 ====================

  private createCatFrames(): void {
    if (this.textures.exists('cat-frame-0-1')) return;
    const tex = this.textures.get('cat-spritesheet');
    const src = tex.getSourceImage() as HTMLImageElement;
    if (!src || !src.width) return;
    const COLS = 4, ROWS = 4;
    this.frameW = Math.floor(src.width / COLS);
    this.frameH = Math.floor(src.height / ROWS);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const key = `cat-frame-${row}-${col}`;
        if (this.textures.exists(key)) continue;
        const ct = this.textures.createCanvas(key, this.frameW, this.frameH)!;
        const ctx = ct.getContext();
        ctx.imageSmoothingEnabled = false;
        // 向内裁1px避免边界像素泄漏
        const margin = 1;
        ctx.drawImage(
          src,
          col * this.frameW + margin, row * this.frameH + margin,
          this.frameW - margin * 2, this.frameH - margin * 2,
          0, 0, this.frameW, this.frameH,
        );
        ct.refresh();
      }
    }
  }

  private setFrame(row: number, col: number): void {
    const key = `cat-frame-${row}-${col}`;
    if (this.textures.exists(key)) this.player.setTexture(key);
  }

  // ==================== UPDATE ====================

  update(_time: number, delta: number): void {
    if (this.editMode) { this.player.setVelocity(0, 0); return; } // 编辑模式禁止移动

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown)   { dx = -1; this.playerDir = 'left'; }
    if (this.cursors.right.isDown || this.wasd.D.isDown)  { dx = 1;  this.playerDir = 'right'; }
    if (this.cursors.up.isDown || this.wasd.W.isDown)     { dy = -1; this.playerDir = 'up'; }
    if (this.cursors.down.isDown || this.wasd.S.isDown)   { dy = 1;  this.playerDir = 'down'; }

    if (dx === 0 && dy === 0) {
      if (this.wasMoving) { this.wasMoving = false; this.animTimer = 0; this.setFrame(this.DIR_ROWS[this.playerDir], 1); }
      this.player.setVelocity(0, 0);
      return;
    }

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this.player.setVelocity(dx * this.speed, dy * this.speed);

    if (!this.wasMoving) { this.wasMoving = true; this.animFrame = 0; this.animTimer = 0; }
    const row = this.DIR_ROWS[this.playerDir];
    this.animTimer += delta;
    while (this.animTimer >= this.FRAME_DURATION) { this.animTimer -= this.FRAME_DURATION; this.animFrame = (this.animFrame + 1) % 4; }
    this.setFrame(row, this.animFrame);

    // 检测靠近的可交互物体
    this.checkNearby();
  }

  // ==================== 物体交互 ====================

  private readonly INTERACT_MARGIN = 35; // 九宫格外扩像素

  private readonly INTERACTIVE_OBJECTS = new Set(['椅子']); // 只有这里的物体会弹窗

  private checkNearby(): void {
    if (this.dialogOpen || this.editMode) return;

    const px = this.player.x;
    const py = this.player.y;
    const pw = 20;

    for (const def of this.colliderDefs) {
      if (!this.INTERACTIVE_OBJECTS.has(def.name)) continue;

      const left = def.x - this.INTERACT_MARGIN;
      const right = def.x + def.w + this.INTERACT_MARGIN;
      const top = def.y - this.INTERACT_MARGIN;
      const bottom = def.y + def.h + this.INTERACT_MARGIN;

      if (px + pw > left && px - pw < right && py + pw > top && py - pw < bottom) {
        this.showObjectDialog(def.name);
        break;
      }
    }
  }

  private showObjectDialog(name: string): void {
    this.dialogOpen = true;

    // 收集所有对话框元素方便清理
    const parts: Phaser.GameObjects.GameObject[] = [];

    const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.4)
      .setDepth(80).setInteractive(); parts.push(mask);

    const boxW = 280, boxH = 120;
    const bx = GAME_W / 2, by = GAME_H / 2;
    const box = this.add.graphics().setDepth(81);
    box.fillStyle(0xffffff, 0.95);
    box.fillRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);
    box.lineStyle(2, 0xcccccc, 1);
    box.strokeRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);
    parts.push(box);

    const title = this.add.text(bx, by - 30, `「${name}」`, {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '18px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82); parts.push(title);

    const question = this.add.text(bx, by + 5, '要开始工作吗？', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '15px', color: '#555555',
    }).setOrigin(0.5).setDepth(82); parts.push(question);

    const closeAll = () => { parts.forEach(p => p.destroy()); this.dialogOpen = false; };

    const btnY = by + 38;
    const makeBtn = (label: string, dx: number, action: () => void) => {
      const bg = this.add.graphics().setDepth(83);
      bg.fillStyle(0x4a90d9, 1);
      bg.fillRoundedRect(bx + dx - 50, btnY - 15, 100, 30, 6);
      parts.push(bg);
      const t = this.add.text(bx + dx, btnY, label, {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(84); parts.push(t);
      this.add.zone(bx + dx, btnY, 100, 30).setInteractive({ useHandCursor: true }).setDepth(85)
        .on('pointerdown', () => { closeAll(); action(); });
    };

    makeBtn('开始工作', -65, () => { this.showDesktopScreen(); });
    makeBtn('离开', 65, () => {});
  }

  private showWorkOptions(): void {
    const parts: Phaser.GameObjects.GameObject[] = [];
    this.dialogOpen = true;

    const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.4)
      .setDepth(80).setInteractive(); parts.push(mask);

    const boxW = 280, boxH = 180;
    const bx = GAME_W / 2, by = GAME_H / 2;
    const box = this.add.graphics().setDepth(81);
    box.fillStyle(0xffffff, 0.95);
    box.fillRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);
    box.lineStyle(2, 0xcccccc, 1);
    box.strokeRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);
    parts.push(box);

    const title = this.add.text(bx, by - 55, '「椅子」', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '18px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82); parts.push(title);

    const prompt = this.add.text(bx, by - 20, '现在你要：', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '16px', color: '#555555',
    }).setOrigin(0.5).setDepth(82); parts.push(prompt);

    const closeAll = () => { parts.forEach(p => p.destroy()); this.dialogOpen = false; };

    const options = [
      { label: '使用电脑', y: by + 25, action: () => { closeAll(); this.showDesktopScreen(); } },
      { label: '画画', y: by + 60, action: () => { closeAll(); this.showToast('开始画画...'); } },
      { label: '做手工', y: by + 95, action: () => { closeAll(); this.showToast('开始做手工...'); } },
    ];

    options.forEach(opt => {
      const w = 180, h = 28;
      const bg = this.add.graphics().setDepth(83);
      bg.fillStyle(0x4a90d9, 1);
      bg.fillRoundedRect(bx - w / 2, opt.y - h / 2, w, h, 6);
      parts.push(bg);
      const t = this.add.text(bx, opt.y, opt.label, {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(84);
      parts.push(t);
      this.add.zone(bx, opt.y, w, h).setInteractive({ useHandCursor: true }).setDepth(85)
        .on('pointerdown', opt.action);
    });

    mask.on('pointerdown', closeAll);
  }

  // 屏幕热区（仅电脑屏幕等特定界面生效，关闭即销毁）
  private screenHotspots: Record<string, { name: string; x: number; y: number; w: number; h: number }[]> = {
    'computer-screen': [
      { name: '英语学习app', x: 402, y: 235, w: 146, h: 143 },
    ],
  };

  private showScreen(textureKey: string): void {
    if (!this.textures.exists(textureKey)) return;
    const parts: Phaser.GameObjects.GameObject[] = [];
    this.dialogOpen = true;

    const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1)
      .setDepth(90).setInteractive(); parts.push(mask);

    const img = this.add.image(GAME_W / 2, GAME_H / 2, textureKey).setDepth(91);
    const s = Math.min(GAME_W / img.width, GAME_H / img.height) * 0.9;
    img.setScale(s); parts.push(img);

    const closeBtn = this.add.text(GAME_W - 40, 20, '✕ 关闭', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '16px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setDepth(92).setInteractive({ useHandCursor: true }); parts.push(closeBtn);

    const closeAll = () => { parts.forEach(p => p.destroy()); this.dialogOpen = false; };
    closeBtn.on('pointerdown', closeAll);
    mask.on('pointerdown', closeAll);

    // 预定义屏幕热区（仅此界面有效，关闭即销毁）
    const hotspots = this.screenHotspots[textureKey] || [];
    hotspots.forEach(hs => {
      const gfx = this.add.graphics().setDepth(93);
      gfx.fillStyle(0x00ff88, 0.15);
      gfx.fillRect(hs.x, hs.y, hs.w, hs.h);
      gfx.lineStyle(1, 0x00ff88, 0.5);
      gfx.strokeRect(hs.x, hs.y, hs.w, hs.h);
      parts.push(gfx);

      const zone = this.add.zone(hs.x + hs.w / 2, hs.y + hs.h / 2, hs.w, hs.h)
        .setInteractive({ useHandCursor: true }).setDepth(94);
      zone.on('pointerover', () => {
        gfx.clear(); gfx.fillStyle(0x00ff88, 0.35); gfx.fillRect(hs.x, hs.y, hs.w, hs.h);
        gfx.lineStyle(2, 0x00ff88, 0.9); gfx.strokeRect(hs.x, hs.y, hs.w, hs.h);
      });
      zone.on('pointerout', () => {
        gfx.clear(); gfx.fillStyle(0x00ff88, 0.15); gfx.fillRect(hs.x, hs.y, hs.w, hs.h);
        gfx.lineStyle(1, 0x00ff88, 0.5); gfx.strokeRect(hs.x, hs.y, hs.w, hs.h);
      });
      zone.on('pointerdown', () => {
        closeAll();
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('DramaScene', { actId: 0 }); });
      });
    });
  }

  private showDesktopScreen(): void {
    if (!this.textures.exists('desktop-screen')) {
      this.showToast('桌面图片未找到');
      return;
    }

    const parts: Phaser.GameObjects.GameObject[] = [];
    this.dialogOpen = true;

    // 全屏遮罩
    const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1)
      .setDepth(90).setInteractive(); parts.push(mask);

    // 桌面图片
    const img = this.add.image(GAME_W / 2, GAME_H / 2, 'desktop-screen').setDepth(91);
    const s = Math.min(GAME_W / img.width, GAME_H / img.height) * 0.9;
    img.setScale(s); parts.push(img);

    // 关闭按钮
    const closeBtn = this.add.text(GAME_W - 40, 20, '✕ 关闭', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '16px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setDepth(92).setInteractive({ useHandCursor: true }); parts.push(closeBtn);

    const closeAll = () => { parts.forEach(p => p.destroy()); this.dialogOpen = false; };
    closeBtn.on('pointerdown', closeAll);

    // 工作选项浮层
    const optBg = this.add.graphics().setDepth(93);
    optBg.fillStyle(0x000000, 0.75);
    optBg.fillRoundedRect(GAME_W / 2 - 160, GAME_H / 2 - 60, 320, 180, 12);
    optBg.lineStyle(1, 0x555555, 1);
    optBg.strokeRoundedRect(GAME_W / 2 - 160, GAME_H / 2 - 60, 320, 180, 12);
    parts.push(optBg);

    const optTitle = this.add.text(GAME_W / 2, GAME_H / 2 - 35, '现在你要：', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(94); parts.push(optTitle);

    const workOpts = [
      { label: '使用电脑', action: () => { closeAll(); this.showScreen('computer-screen'); } },
      { label: '画画', action: () => { closeAll(); this.showToast('开始画画...'); } },
      { label: '做手工', action: () => { closeAll(); this.showToast('开始做手工...'); } },
    ];

    workOpts.forEach((opt, i) => {
      const oy = GAME_H / 2 + 5 + i * 42;
      const bg = this.add.graphics().setDepth(94);
      bg.fillStyle(0x3355aa, 1);
      bg.fillRoundedRect(GAME_W / 2 - 100, oy - 14, 200, 34, 6);
      parts.push(bg);
      const t = this.add.text(GAME_W / 2, oy, opt.label, {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: '15px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(95);
      parts.push(t);
      this.add.zone(GAME_W / 2, oy, 200, 34).setInteractive({ useHandCursor: true }).setDepth(96)
        .on('pointerdown', opt.action);
    });
  }

  // ==================== 门 ====================

  private doorX = GAME_W - 60; private doorY = GAME_H / 2;

  private createDoorHint(): void {
    const glow = this.add.rectangle(this.doorX, this.doorY, 30, 64, 0xffcc00, 0.3).setDepth(5);
    this.tweens.add({ targets: glow, alpha: 0.08, duration: 1200, yoyo: true, repeat: -1 });
    this.add.text(this.doorX, this.doorY - 50, '门\n按E', {
      fontFamily: '"Microsoft YaHei", Arial, sans-serif', fontSize: '11px', color: '#ffcc00', align: 'center',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.65);
  }

  private tryEnterDoor(): void {
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorX, this.doorY);
    if (dist < 55) {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('DramaScene', { actId: 0 }); });
    } else {
      const pop = this.add.text(this.player.x, this.player.y - 40, '离门太远了', {
        fontFamily: '"Microsoft YaHei", Arial, sans-serif', fontSize: '13px', color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: pop, alpha: 0, y: pop.y - 25, duration: 1400, onComplete: () => pop.destroy() });
    }
  }
}
