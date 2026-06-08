import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../utils/Constants';

const TILE = 32;
const COLS = 30;
const ROWS = 22;

// 瓦片类型
const T = { FLOOR: 0, WALL: 1, ALTAR: 2, PEW: 3, CROSS: 4, DOOR: 5, CANDLE: 6, STATUE: 7 };

// 教堂地图阵列 (22行 × 30列)
const CHURCH_MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,6,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,6,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,2,2,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,2,2,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,2,2,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,0,3,3,1,0,1,0,3,3,3,3,0,1,0,1,0,3,3,0,0,0,3,3,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,0,3,3,1,0,1,0,3,4,4,3,0,1,0,1,0,3,3,0,0,0,3,3,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,0,3,3,1,0,0,0,0,0,0,0,0,0,0,1,0,3,3,0,0,0,3,3,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,5,5,5,0,0,1,0,0,5,5,0,0,1,0,0,5,5,5,0,0,0,0,0,1],
  [1,0,0,7,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,7,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// 瓦片颜色
const COLORS: Record<number, number> = {
  [T.FLOOR]: 0x3d2b1f,   // 深木地板
  [T.WALL]:  0x5c4a3a,   // 石墙
  [T.ALTAR]: 0x8b7355,   // 祭坛
  [T.PEW]:   0x6b4423,   // 长椅
  [T.CROSS]: 0xffd700,   // 金色十字架
  [T.DOOR]:  0x8b4513,   // 门
  [T.CANDLE]:0xffaa00,   // 蜡烛
  [T.STATUE]:0x999999,   // 雕像
};

export class ChurchMapScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private speed = 160;
  private playerDir = 'down';
  private frameW = 0; private frameH = 0;
  private animFrame = 1; private animTimer = 0;
  private wasMoving = false;
  private readonly FRAME_DURATION = 140;
  private readonly DIR_ROWS: Record<string, number> = { down: 0, left: 2, right: 1, up: 3 };

  constructor() { super({ key: 'ChurchMapScene' }); }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // 生成瓦片纹理
    this.generateTiles();

    // 绘制地图
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tileType = CHURCH_MAP[row][col];
        const key = `tile-${tileType}`;
        if (this.textures.exists(key)) {
          this.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, key).setDepth(0);
        }
      }
    }

    // 碰撞层（墙壁和物体）
    const wallGroup = this.physics.add.staticGroup();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = CHURCH_MAP[row][col];
        if (t === T.WALL || t === T.ALTAR || t === T.PEW || t === T.STATUE) {
          const w = this.add.rectangle(col * TILE + TILE / 2, row * TILE + TILE / 2, TILE, TILE).setVisible(false);
          wallGroup.add(w);
        }
      }
    }

    // 切割行走图
    this.createCatFrames();

    // 玩家
    const spawnCol = 15, spawnRow = 20;
    this.player = this.physics.add.sprite(spawnCol * TILE, spawnRow * TILE, 'cat-frame-0-1')
      .setDepth(10).setScale(0.5);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(this.frameW * 0.4, this.frameH * 0.3);
    this.player.body!.setOffset(this.frameW * 0.3, this.frameH * 0.6);

    this.physics.add.collider(this.player, wallGroup);

    // 摄像机
    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // 输入
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = { W: this.input.keyboard!.addKey('W'), A: this.input.keyboard!.addKey('A'), S: this.input.keyboard!.addKey('S'), D: this.input.keyboard!.addKey('D') };

    // E 键交互
    this.input.keyboard!.addKey('E').on('down', () => this.tryInteract());

    // 蜡烛闪烁
    this.time.addEvent({ delay: 800, loop: true, callback: () => {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (CHURCH_MAP[row][col] === T.CANDLE) {
            // 简单闪烁（不做动态更新，性能考虑）
          }
        }
      }
    }});

    // 提示
    const hint = this.add.text(GAME_W / 2, 20, 'WASD 移动 | E 交互 | 走到门口进入剧情', {
      fontFamily: '"Microsoft YaHei", Arial', fontSize: '13px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
    this.tweens.add({ targets: hint, alpha: 0, delay: 5000, duration: 1000 });
  }

  // ============ 行走图 ============

  private createCatFrames(): void {
    if (this.textures.exists('cat-frame-0-1')) return;
    const tex = this.textures.get('cat-spritesheet');
    const src = tex.getSourceImage() as HTMLImageElement;
    if (!src || !src.width) return;
    const COLS_N = 4, ROWS_N = 4;
    this.frameW = Math.floor(src.width / COLS_N);
    this.frameH = Math.floor(src.height / ROWS_N);
    for (let row = 0; row < ROWS_N; row++) {
      for (let col = 0; col < COLS_N; col++) {
        const key = `cat-frame-${row}-${col}`;
        if (this.textures.exists(key)) continue;
        const ct = this.textures.createCanvas(key, this.frameW, this.frameH)!;
        const ctx = ct.getContext();
        ctx.imageSmoothingEnabled = false;
        const m = 1;
        ctx.drawImage(src, col * this.frameW + m, row * this.frameH + m, this.frameW - m * 2, this.frameH - m * 2, 0, 0, this.frameW, this.frameH);
        ct.refresh();
      }
    }
  }

  private setFrame(row: number, col: number): void {
    const key = `cat-frame-${row}-${col}`;
    if (this.textures.exists(key)) this.player.setTexture(key);
  }

  // ============ 瓦片生成 ============

  private generateTiles(): void {
    if (this.textures.exists('tile-0')) return;
    const entries = Object.entries(COLORS);
    entries.forEach(([type, color]) => {
      const gfx = this.add.graphics();
      const t = parseInt(type);
      // 基础色
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, TILE, TILE);

      // 特殊纹理
      if (t === T.FLOOR) {
        gfx.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(10).color, 1);
        for (let i = 0; i < 3; i++) { gfx.fillRect(Phaser.Math.Between(2, 28), Phaser.Math.Between(2, 28), 1, 1); }
      } else if (t === T.WALL) {
        gfx.lineStyle(1, Phaser.Display.Color.ValueToColor(color).lighten(20).color, 0.3);
        gfx.strokeRect(2, 2, TILE - 4, TILE - 4);
        gfx.lineBetween(0, 0, TILE, TILE);
        gfx.lineBetween(TILE, 0, 0, TILE);
      } else if (t === T.CROSS) {
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillRect(TILE / 2 - 2, 4, 4, TILE - 8);
        gfx.fillRect(8, TILE / 2 - 2, TILE - 16, 4);
      } else if (t === T.CANDLE) {
        gfx.fillStyle(0xffaa00, 0.6);
        gfx.fillCircle(TILE / 2, TILE / 2, 6);
        gfx.fillStyle(0xffff00, 0.4);
        gfx.fillCircle(TILE / 2, TILE / 2, 3);
      } else if (t === T.ALTAR) {
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.strokeRect(4, 4, TILE - 8, TILE - 8);
        gfx.fillStyle(0x000000, 0.2);
        gfx.fillRect(6, 6, TILE - 12, TILE - 12);
      } else if (t === T.PEW) {
        gfx.fillStyle(Phaser.Display.Color.ValueToColor(color).lighten(15).color, 0.5);
        for (let y = 6; y < TILE - 6; y += 6) { gfx.fillRect(4, y, TILE - 8, 2); }
      }

      gfx.generateTexture(`tile-${t}`, TILE, TILE);
      gfx.destroy();
    });
  }

  // ============ 交互 ============

  private tryInteract(): void {
    const px = Math.floor(this.player.x / TILE);
    const py = Math.floor(this.player.y / TILE);

    // 检查周围4格
    for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const cx = px + dx, cy = py + dy;
      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
        const tile = CHURCH_MAP[cy][cx];
        if (tile === T.CROSS) {
          this.interactWith('十字架');
          return;
        } else if (tile === T.CANDLE) {
          this.interactWith('蜡烛');
          return;
        } else if (tile === T.ALTAR) {
          this.interactWith('祭坛');
          return;
        } else if (tile === T.DOOR) {
          this.interactWith('门');
          return;
        }
      }
    }
  }

  private interactWith(name: string): void {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const mask = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.5)
      .setDepth(200).setScrollFactor(0).setInteractive(); parts.push(mask);

    const box = this.add.graphics().setDepth(201).setScrollFactor(0);
    box.fillStyle(0x1a1a2e, 0.95);
    box.fillRoundedRect(GAME_W / 2 - 150, GAME_H / 2 - 40, 300, 80, 10);
    parts.push(box);

    const label = name === '十字架' ? '你在十字架前默默祈祷...' :
      name === '蜡烛' ? '烛光摇曳，温暖而微弱。' :
      name === '祭坛' ? '祭坛上放着一本打开的书。' :
      name === '门' ? '你走出了教堂。' : '';

    this.add.text(GAME_W / 2, GAME_H / 2, `「${name}」\n${label}`, {
      fontFamily: '"Microsoft YaHei", Arial', fontSize: '16px', color: '#ffffff',
      align: 'center', wordWrap: { width: 280 },
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    const closeAll = () => parts.forEach(p => p.destroy());

    if (name === '门') {
      this.time.delayedCall(1200, () => {
        closeAll();
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WalkScene');
        });
      });
    } else {
      this.time.delayedCall(2000, closeAll);
      mask.on('pointerdown', closeAll);
    }
  }

  // ============ 更新 ============

  update(_time: number, delta: number): void {
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
}
