/**
 * Audio system for horror sub-game.
 * Manages background music, ambient sounds, and sound effects.
 * Currently a stub - will be implemented with actual audio assets.
 */
export class AudioSystem {
  private scene: Phaser.Scene;
  private currentBGM: string | null = null;
  private ambientSounds: Map<string, Phaser.Sound.BaseSound> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playBGM(key: string, volume: number = 0.3): void {
    if (this.currentBGM === key) return;
    this.stopBGM();

    try {
      if (this.scene.sound.get(key)) {
        this.scene.sound.play(key, { loop: true, volume });
        this.currentBGM = key;
      }
    } catch {
      // Audio assets not loaded yet - silent fallback
      console.log(`BGM "${key}" not available`);
    }
  }

  stopBGM(): void {
    if (this.currentBGM && this.scene.sound.get(this.currentBGM)) {
      this.scene.sound.stopByKey(this.currentBGM);
    }
    this.currentBGM = null;
  }

  playAmbient(key: string, volume: number = 0.2): void {
    try {
      if (!this.ambientSounds.has(key) && this.scene.sound.get(key)) {
        const sound = this.scene.sound.add(key, { loop: true, volume });
        sound.play();
        this.ambientSounds.set(key, sound);
      }
    } catch {
      // Silent fallback
    }
  }

  stopAmbient(key: string): void {
    const sound = this.ambientSounds.get(key);
    if (sound) {
      sound.stop();
      this.ambientSounds.delete(key);
    }
  }

  stopAllAmbient(): void {
    for (const [key, sound] of this.ambientSounds) {
      sound.stop();
    }
    this.ambientSounds.clear();
  }

  playSFX(key: string, volume: number = 0.5): void {
    try {
      if (this.scene.sound.get(key)) {
        this.scene.sound.play(key, { volume });
      }
    } catch {
      // Silent fallback
    }
  }

  setBGMVolume(volume: number): void {
    if (this.currentBGM) {
      const sound = this.scene.sound.get(this.currentBGM);
      if (sound) {
        (sound as Phaser.Sound.WebAudioSound).setVolume(volume);
      }
    }
  }

  destroy(): void {
    this.stopBGM();
    this.stopAllAmbient();
  }
}
