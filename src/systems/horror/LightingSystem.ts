import Phaser from 'phaser';

/**
 * Simple 2D lighting system for horror sub-game.
 * Creates a dark overlay with a "hole" around the player.
 */
export class LightingSystem {
  private scene: Phaser.Scene;
  private darkness!: Phaser.GameObjects.Graphics;
  private lightRadius: number;
  private playerRef: Phaser.GameObjects.GameObject;

  constructor(scene: Phaser.Scene, player: Phaser.GameObjects.GameObject, radius: number = 120) {
    this.scene = scene;
    this.playerRef = player;
    this.lightRadius = radius;

    this.darkness = scene.add.graphics().setDepth(50).setScrollFactor(0);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.darkness.clear();

    const player = this.playerRef as unknown as Phaser.GameObjects.Components.Transform;
    const screenX = player.x - camera.scrollX;
    const screenY = player.y - camera.scrollY;

    // Fill entire visible area with darkness
    this.darkness.fillStyle(0x000000, 0.85);
    this.darkness.fillRect(
      camera.scrollX - 100,
      camera.scrollY - 100,
      camera.width + 200,
      camera.height + 200
    );

    // Cut out light circle around player (using eraser or blendMode)
    // Phaser Graphics doesn't support eraser natively, so we use a workaround
    // by drawing the darkness and then "cutting" with blendMode
    this.darkness.fillStyle(0x000000, 0);
    // Draw radial gradient-like effect with concentric circles
    const steps = 10;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = this.lightRadius * t;
      const alpha = 0.85 * (1 - t) * (1 - t);
      this.darkness.fillStyle(0x000000, alpha);
      this.darkness.fillCircle(player.x, player.y, r);
    }
  }

  setRadius(radius: number): void {
    this.lightRadius = radius;
  }

  destroy(): void {
    this.darkness.destroy();
  }
}
