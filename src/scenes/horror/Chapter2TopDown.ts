import Phaser from 'phaser';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

const TILE = 32;
const ROOM_COLS = 15;
const ROOM_ROWS = 12;

export class Chapter2TopDown extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private walls: Phaser.GameObjects.Rectangle[] = [];
  private monsters: Phaser.GameObjects.Rectangle[] = [];
  private keys: { x: number; y: number; collected: boolean; sprite: Phaser.GameObjects.Rectangle }[] = [];
  private exitDoor!: Phaser.GameObjects.Rectangle;
  private hasKey = false;
  private isHidden = false;
  private stamina = 100;

  constructor() {
    super({ key: 'Chapter2TopDown' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a14');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Chapter title
    const title = this.add.text(PIXEL_W / 2, 20, 'Chapter 2: 地下室', {
      ...pixelTextStyle(8, '#cccccc'),
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: title, alpha: 0, delay: 3000, duration: 1000 });

    // Camera for top-down view
    this.cameras.main.setBounds(0, 0, ROOM_COLS * TILE, ROOM_ROWS * TILE);

    // Build rooms
    this.buildBasement();

    // Player
    this.player = this.add.rectangle(3 * TILE + TILE / 2, 3 * TILE + TILE / 2, TILE - 6, TILE - 6, 0xff6b6b);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    const shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // HUD
    this.add.text(5, PIXEL_H - 15, '←→↑↓ Move  Shift Run  Ctrl Hide', {
      ...pixelTextStyle(5, '#666666'),
    }).setScrollFactor(0).setDepth(100);

    // Stamina bar
    const staminaBar = this.add.rectangle(5, 5, 60, 6, 0x3333ff).setOrigin(0, 0).setScrollFactor(0).setDepth(100);

    // Monster patrol logic
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        // Update stamina
        this.stamina = Phaser.Math.Clamp(this.stamina + (shiftKey.isDown ? -0.1 : 0.02), 0, 100);
        staminaBar.width = (this.stamina / 100) * 60;

        // Move monsters
        for (const monster of this.monsters) {
          // Simple random patrol
          if (Math.random() < 0.01) {
            const dx = Phaser.Math.Between(-1, 1);
            const dy = Phaser.Math.Between(-1, 1);
            const newX = monster.x + dx * TILE;
            const newY = monster.y + dy * TILE;

            // Check wall collision
            let blocked = false;
            for (const wall of this.walls) {
              if (Math.abs(newX - wall.x) < TILE && Math.abs(newY - wall.y) < TILE) {
                blocked = true;
                break;
              }
            }

            if (!blocked && newX > 0 && newX < ROOM_COLS * TILE && newY > 0 && newY < ROOM_ROWS * TILE) {
              monster.x = newX;
              monster.y = newY;
            }
          }
        }
      },
    });

    // Interaction
    this.input.keyboard!.on('keydown-E', () => {
      this.tryInteract();
    });
  }

  private buildBasement(): void {
    // Outer walls
    for (let x = 0; x < ROOM_COLS; x++) {
      this.walls.push(this.addWall(x, 0));
      this.walls.push(this.addWall(x, ROOM_ROWS - 1));
    }
    for (let y = 1; y < ROOM_ROWS - 1; y++) {
      this.walls.push(this.addWall(0, y));
      this.walls.push(this.addWall(ROOM_COLS - 1, y));
    }

    // Internal walls (maze-like)
    const internalWalls = [
      [3, 1], [3, 2], [3, 3], [3, 5], [3, 6],
      [6, 3], [6, 4], [6, 6], [6, 7], [6, 8],
      [9, 1], [9, 2], [9, 4], [9, 5], [9, 7], [9, 8],
      [12, 3], [12, 4], [12, 5],
    ];

    for (const [wx, wy] of internalWalls) {
      this.walls.push(this.addWall(wx, wy));
    }

    // Key placement (random position in accessible area)
    this.keys.push({
      x: 11 * TILE + TILE / 2,
      y: 2 * TILE + TILE / 2,
      collected: false,
      sprite: this.add.rectangle(11 * TILE + TILE / 2, 2 * TILE + TILE / 2, 12, 12, 0xffff00),
    });

    // Exit door
    this.exitDoor = this.add.rectangle(14 * TILE + TILE / 2, 11 * TILE + TILE / 2, TILE, TILE, 0x4444ff, 0.5);
    this.tweens.add({ targets: this.exitDoor, alpha: 0.2, duration: 1000, yoyo: true, repeat: -1 });

    // Monster
    const monster = this.add.rectangle(7 * TILE + TILE / 2, 5 * TILE + TILE / 2, TILE - 4, TILE - 4, 0x8b0000, 0.8);
    this.monsters.push(monster);
  }

  private addWall(x: number, y: number): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE, TILE, 0x2c2c3a);
  }

  private tryInteract(): void {
    // Check key pickup
    for (const key of this.keys) {
      if (!key.collected && Math.abs(this.player.x - key.x) < TILE && Math.abs(this.player.y - key.y) < TILE) {
        key.collected = true;
        key.sprite.destroy();
        this.hasKey = true;
        return;
      }
    }

    // Check exit
    if (this.hasKey && Math.abs(this.player.x - this.exitDoor.x) < TILE && Math.abs(this.player.y - this.exitDoor.y) < TILE) {
      this.completeChapter();
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const speed = this.cursors.shift?.isDown && this.stamina > 0 ? 180 : 100;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown) dx -= 1;
    if (this.cursors.right.isDown) dx += 1;
    if (this.cursors.up.isDown) dy -= 1;
    if (this.cursors.down.isDown) dy += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    let newX = this.player.x + dx * speed * dt;
    let newY = this.player.y + dy * speed * dt;

    // Wall collision
    for (const wall of this.walls) {
      if (
        Math.abs(newX - wall.x) < TILE - 2 &&
        Math.abs(newY - wall.y) < TILE - 2
      ) {
        newX = this.player.x;
        newY = this.player.y;
        break;
      }
    }

    this.player.x = newX;
    this.player.y = newY;

    // Monster collision check
    for (const monster of this.monsters) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.x, monster.y);
      if (dist < TILE * 1.5 && !this.isHidden) {
        this.cameras.main.shake(100, 0.005);
        this.player.x = 3 * TILE + TILE / 2;
        this.player.y = 3 * TILE + TILE / 2;
        this.hasKey = false;
        // Reset keys
        for (const key of this.keys) {
          if (key.collected) {
            key.collected = false;
            key.sprite = this.add.rectangle(key.x, key.y, 12, 12, 0xffff00);
          }
        }
      }
    }

    // Hide mechanic
    if (this.cursors.shift && Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL))) {
      this.isHidden = !this.isHidden;
      this.player.setAlpha(this.isHidden ? 0.3 : 1);
    }
  }

  private completeChapter(): void {
    useHorrorStore.getState().completeChapter(2);
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Chapter3SideScroll');
    });
  }
}
