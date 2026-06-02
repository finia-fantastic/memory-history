import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { GAME_W, GAME_H } from '../utils/Constants';

export class WalkScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private speed = 150;
  private colliderGroup!: Phaser.Physics.Arcade.StaticGroup;
  private wallRectsData: [number, number, number, number][] = [];

  // ---- 行走图 ----
  private readonly DIR_ROWS: Record<string, number> = { down: 0, left: 1, right: 2, up: 3 };
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
      .setDepth(10).setScale(0.25);
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
    const rect = this.add.rectangle(x, y, w, h).setOrigin(0, 0).setVisible(false);
    this.colliderGroup.add(rect);
    this.wallRectsData.push([x, y, w, h]);
    // 打印到控制台方便复制
    console.log(`[${Math.round(x)}, ${Math.round(y)}, ${Math.round(w)}, ${Math.round(h)}],`);
  }

  private removeColliderAt(mx: number, my: number): void {
    const children = this.colliderGroup.getChildren() as Phaser.GameObjects.Rectangle[];
    for (let i = children.length - 1; i >= 0; i--) {
      const c = children[i];
      if (mx >= c.x && mx <= c.x + c.width && my >= c.y && my <= c.y + c.height) {
        // 从数据中移除
        const idx = this.wallRectsData.findIndex(
          r => r[0] === c.x && r[1] === c.y && r[2] === c.width && r[3] === c.height
        );
        if (idx >= 0) this.wallRectsData.splice(idx, 1);
        c.destroy();
        this.updateEditHint();
        console.log('已删除碰撞体，剩余：');
        this.printAllRects();
        return;
      }
    }
  }

  private updateEditHint(): void {
    if (!this.editMode) return;
    const count = this.colliderGroup.getLength();
    this.editLabel.setText(`✏ 编辑模式 | 拖拽添加碰撞体 | 右键删除 | 当前 ${count} 个 | 坐标已输出到控制台(F12)`);
    this.printAllRects();
  }

  private printAllRects(): void {
    console.clear();
    console.log('=== 碰撞体坐标 [x, y, w, h] ===');
    for (const r of this.wallRectsData) {
      console.log(`[${Math.round(r[0])}, ${Math.round(r[1])}, ${Math.round(r[2])}, ${Math.round(r[3])}],`);
    }
    console.log('=== 按 F11 一键保存 ===');
  }

  private saveCollisionData(): void {
    if (this.wallRectsData.length === 0) {
      alert('没有碰撞数据可保存');
      return;
    }

    // 生成代码文本
    const lines = this.wallRectsData.map(
      r => `      [${Math.round(r[0])}, ${Math.round(r[1])}, ${Math.round(r[2])}, ${Math.round(r[3])}],`
    );
    const code = '[\n' + lines.join('\n') + '\n    ]';

    // 1. 复制到剪贴板
    navigator.clipboard.writeText(code).then(() => {
      this.showToast('✅ 已复制到剪贴板！粘贴给我或打开 collision-data.txt');
    }).catch(() => {});

    // 2. 下载文件
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'collision-data.txt'; a.click();
    URL.revokeObjectURL(url);

    console.log('=== 已保存的碰撞数据 ===');
    console.log(code);
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
    this.wallRectsData = [];

    this.colliderGroup = this.physics.add.staticGroup();
    this.wallRectsData.forEach(([x, y, w, h]) => {
      const wall = this.add.rectangle(x, y, w, h).setOrigin(0, 0).setVisible(false);
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
        ctx.drawImage(src, col * this.frameW, row * this.frameH, this.frameW, this.frameH, 0, 0, this.frameW, this.frameH);
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
