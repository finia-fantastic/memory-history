import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Set initial game phase
    useGameStore.getState().setPhase('boot');

    // Minimal setup, then go to preload
    this.scene.start('PreloadScene');
  }
}
