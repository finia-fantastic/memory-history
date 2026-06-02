import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

const TILE = 32;
const MAP_W = 60; // tiles wide
const MAP_H = 30; // tiles tall
const GRAVITY = 800;

export class Chapter1SideScroll extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerVX = 0;
  private playerVY = 0;
  private onGround = false;
  private speed = 120;
  private jumpPower = -280;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private groundY = PIXEL_H - TILE * 2;
  private walls: Phaser.GameObjects.Rectangle[] = [];
  private exitZone!: Phaser.GameObjects.Zone;
  private chapterTitle!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Chapter1SideScroll' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Chapter title
    this.chapterTitle = this.add.text(PIXEL_W / 2, 30, 'Chapter 1: 废弃公寓', {
      ...pixelTextStyle(8, '#cccccc'),
    }).setOrigin(0.5).setScrollFactor(0);

    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: this.chapterTitle, alpha: 0, duration: 1000 });
    });

    // Build level
    this.buildLevel();

    // Create player (pixel art cat placeholder)
    this.player = this.add.rectangle(100, this.groundY - TILE, TILE - 4, TILE - 4, 0xff6b6b);
    this.player.setStrokeStyle(2, 0xcc4444);

    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.setZoom(1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Interaction key
    const interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Exit zone
    this.exitZone = this.add.zone((MAP_W - 2) * TILE, this.groundY - TILE, TILE * 2, TILE * 2);
    this.physics.add.existing(this.exitZone, true);

    // HUD
    this.add.text(10, PIXEL_H - 20, '←→ Move  ↑ Jump  E Interact', {
      ...pixelTextStyle(5, '#666666'),
    }).setScrollFactor(0).setDepth(100);

    // Instructions
    this.time.delayedCall(5000, () => {
      this.showDialog(['这...是哪里？', '我好像做了一个很长的梦...', '必须找到出去的路。']);
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.playerVX = -this.speed;
    } else if (this.cursors.right.isDown) {
      this.playerVX = this.speed;
    } else {
      this.playerVX *= 0.8;
    }

    // Jump
    if ((this.cursors.up.isDown || this.cursors.space?.isDown) && this.onGround) {
      this.playerVY = this.jumpPower;
    }

    // Gravity
    this.playerVY += GRAVITY * dt;

    // Apply movement
    let newX = this.player.x + this.playerVX * dt;
    let newY = this.player.y + this.playerVY * dt;

    // Ground collision
    if (newY + TILE / 2 > this.groundY) {
      newY = this.groundY - TILE / 2;
      this.playerVY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Wall collision
    for (const wall of this.walls) {
      const bounds = wall.getBounds();
      // Simple AABB collision
      if (
        newX + TILE / 2 > bounds.left &&
        newX - TILE / 2 < bounds.right &&
        newY + TILE / 2 > bounds.top &&
        newY - TILE / 2 < bounds.bottom
      ) {
        // Push out
        const overlapX = Math.min(
          Math.abs(newX + TILE / 2 - bounds.left),
          Math.abs(newX - TILE / 2 - bounds.right)
        );
        const overlapY = Math.min(
          Math.abs(newY + TILE / 2 - bounds.top),
          Math.abs(newY - TILE / 2 - bounds.bottom)
        );

        if (overlapX < overlapY) {
          newX = this.player.x;
          this.playerVX = 0;
        } else {
          newY = this.player.y;
          this.playerVY = 0;
          if (this.playerVY > 0) this.onGround = true;
        }
      }
    }

    // Clamp to world bounds
    newX = Phaser.Math.Clamp(newX, TILE / 2, MAP_W * TILE - TILE / 2);
    newY = Phaser.Math.Clamp(newY, 0, MAP_H * TILE);

    this.player.x = newX;
    this.player.y = newY;

    // Check exit
    const px = this.player.x;
    const py = this.player.y;
    const ex = this.exitZone.x;
    const ey = this.exitZone.y;
    if (Math.abs(px - ex) < TILE && Math.abs(py - ey) < TILE) {
      this.completeChapter();
    }
  }

  private buildLevel(): void {
    // Ground
    for (let x = 0; x < MAP_W; x++) {
      const tile = this.add.rectangle(
        x * TILE + TILE / 2,
        this.groundY + TILE / 2,
        TILE - 1,
        TILE - 1,
        0x4a3728
      );
      tile.setStrokeStyle(1, 0x5c4430);
      this.walls.push(tile);
    }

    // Some walls/obstacles
    const wallPositions = [
      { x: 8, y: this.groundY - TILE * 2 },
      { x: 9, y: this.groundY - TILE * 2 },
      { x: 15, y: this.groundY - TILE * 3 },
      { x: 16, y: this.groundY - TILE * 3 },
      { x: 17, y: this.groundY - TILE * 3 },
      { x: 25, y: this.groundY - TILE },
      { x: 35, y: this.groundY - TILE * 2 },
      { x: 36, y: this.groundY - TILE * 2 },
      { x: 37, y: this.groundY - TILE * 2 },
      { x: 45, y: this.groundY - TILE * 4 },
      { x: 46, y: this.groundY - TILE * 4 },
    ];

    for (const wp of wallPositions) {
      const wall = this.add.rectangle(
        wp.x * TILE + TILE / 2,
        wp.y,
        TILE - 1,
        TILE - 1,
        0x2c2c3a
      );
      wall.setStrokeStyle(1, 0x3a3a4a);
      this.walls.push(wall);
    }

    // Exit marker (glowing door)
    const exitMarker = this.add.rectangle(
      (MAP_W - 2) * TILE + TILE / 2,
      this.groundY - TILE / 2,
      TILE,
      TILE,
      0x4444ff,
      0.5
    );
    this.tweens.add({
      targets: exitMarker,
      alpha: 0.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private showDialog(lines: string[]): void {
    let currentLine = 0;

    const showNext = () => {
      // Remove old dialog
      const oldBox = this.children.getByName('dialog-box');
      if (oldBox) oldBox.destroy();

      if (currentLine >= lines.length) return;

      const boxY = PIXEL_H - 60;
      const box = this.add.graphics().setName('dialog-box').setScrollFactor(0).setDepth(200);
      box.fillStyle(0x000000, 0.85);
      box.fillRoundedRect(20, boxY, PIXEL_W - 40, 50, 4);
      box.lineStyle(1, 0x444444, 1);
      box.strokeRoundedRect(20, boxY, PIXEL_W - 40, 50, 4);

      const text = this.add.text(35, boxY + 15, lines[currentLine], {
        ...pixelTextStyle(6, '#ffffff'),
      }).setScrollFactor(0).setDepth(201);

      currentLine++;

      this.input.keyboard?.once('keydown-E', () => {
        box.destroy();
        text.destroy();
        showNext();
      });

      this.input.once('pointerdown', () => {
        box.destroy();
        text.destroy();
        showNext();
      });
    };

    showNext();
  }

  private completeChapter(): void {
    useHorrorStore.getState().completeChapter(1);
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Chapter2TopDown');
    });
  }
}
