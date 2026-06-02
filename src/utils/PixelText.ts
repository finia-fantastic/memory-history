import Phaser from 'phaser';

/**
 * Creates a pixel-perfect text style for the horror sub-game.
 */
export function pixelTextStyle(
  size: number = 8,
  color: string = '#ffffff',
  align: 'left' | 'center' | 'right' = 'left'
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: `${size}px`,
    color,
    align,
    resolution: 4,
  };
}

/**
 * Creates text style for the main game (anime style).
 */
export function mainTextStyle(
  size: string = '18px',
  color: string = '#333333'
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: size,
    color,
    wordWrap: { width: 400 },
  };
}
