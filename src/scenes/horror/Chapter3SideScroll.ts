import Phaser from 'phaser';
import { useHorrorStore } from '../../store/horrorStore';
import { PIXEL_W, PIXEL_H } from '../../utils/Constants';
import { pixelTextStyle } from '../../utils/PixelText';

const TILE = 32;

export class Chapter3SideScroll extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerVX = 0;
  private playerVY = 0;
  private onGround = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private groundY = PIXEL_H - TILE * 2;
  private chaser!: Phaser.GameObjects.Rectangle;
  private chaseActive = false;
  private chaseSpeed = 0;
  private distance = 0;

  constructor() {
    super({ key: 'Chapter3SideScroll' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Title
    const title = this.add.text(PIXEL_W / 2, 20, 'Chapter 3: 扭曲走廊', {
      ...pixelTextStyle(8, '#ff6666'),
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: title, alpha: 0, delay: 3000, duration: 1000 });

    // Player
    this.player = this.add.rectangle(50, this.groundY - TILE, TILE - 4, TILE - 4, 0xff6b6b);
    this.player.setStrokeStyle(2, 0xcc4444);

    // Chaser (shadow monster)
    this.chaser = this.add.rectangle(PIXEL_W + 50, this.groundY - TILE, TILE + 4, TILE + 8, 0x8b0000, 0.9);
    this.chaser.setStrokeStyle(2, 0x440000);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.05, 0.1);
    this.cameras.main.setBounds(0, 0, 3000, PIXEL_H);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // HUD
    this.add.text(5, PIXEL_H - 15, 'RUN! →  Escape the shadow!', {
      ...pixelTextStyle(5, '#ff4444'),
    }).setScrollFactor(0).setDepth(100);

    // Start chase after 2 seconds
    this.time.delayedCall(2000, () => {
      this.chaseActive = true;
      this.chaseSpeed = 60;
      this.cameras.main.shake(300, 0.003);
    });

    // Speed warning
    this.time.delayedCall(5000, () => {
      const warn = this.add.text(PIXEL_W / 2, PIXEL_H / 2 - 40, 'FASTER!', {
        ...pixelTextStyle(14, '#ff0000'),
      }).setOrigin(0.5).setScrollFactor(0);
      this.tweens.add({ targets: warn, alpha: 0, duration: 500 });
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const runSpeed = 200;

    if (this.cursors.right.isDown) {
      this.playerVX = runSpeed;
    } else if (this.cursors.left.isDown) {
      this.playerVX = -runSpeed;
    } else {
      this.playerVX *= 0.9;
    }

    // Jump
    if ((this.cursors.up.isDown || this.cursors.space?.isDown) && this.onGround) {
      this.playerVY = -300;
    }

    // Gravity
    this.playerVY += 800 * dt;
    this.player.x += this.playerVX * dt;
    this.player.y += this.playerVY * dt;

    // Ground
    if (this.player.y + TILE / 2 > this.groundY) {
      this.player.y = this.groundY - TILE / 2;
      this.playerVY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Clamp
    this.player.x = Phaser.Math.Clamp(this.player.x, TILE / 2, 3000);
    this.player.y = Phaser.Math.Clamp(this.player.y, 0, PIXEL_H);

    // Chaser logic
    if (this.chaseActive) {
      this.chaseSpeed += 2 * dt; // Gradually faster
      const chaseDx = this.player.x - this.chaser.x;
      this.chaser.x += Math.sign(chaseDx) * this.chaseSpeed * dt;
      this.chaser.y = this.groundY - TILE / 2;

      this.distance = Math.abs(this.player.x - this.chaser.x);

      // Caught?
      if (this.distance < TILE) {
        this.cameras.main.shake(200, 0.01);
        this.scene.restart();
        return;
      }

      // Escaped?
      if (this.player.x > 2900) {
        this.completeChapter();
        return;
      }
    }
  }

  private completeChapter(): void {
    this.chaseActive = false;
    useHorrorStore.getState().completeChapter(3);
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Chapter4Final');
    });
  }
}
