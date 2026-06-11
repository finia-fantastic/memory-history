/**
 * BGM 管理器 — 全局背景音乐控制
 *
 * 使用方法：
 *   放 mp3/ogg 文件到 assets/main/bgm/ 目录
 *   在 PreloadScene 里用 this.load.audio('bgm-文件名', 'assets/main/bgm/文件名.mp3')
 *   然后 BGMManager.play('bgm-文件名') 播放
 *
 * 快捷键：
 *   M = 静音/取消静音
 *   - = 音量减
 *   + = 音量增
 */

export class BGMManager {
  private scene: Phaser.Scene;
  private currentKey: string | null = null;
  private currentSound: Phaser.Sound.BaseSound | null = null;
  private volume = 0.3;
  private muted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupHotkeys();
  }

  /** 播放指定 BGM（循环），未加载时自动重试 */
  play(key: string, vol?: number, retry = 0): void {
    if (this.currentKey === key && this.currentSound?.isPlaying) return;

    this.stop();
    if (vol !== undefined) this.volume = vol;

    if (this.scene.sound.get(key)) {
      this.currentSound = this.scene.sound.add(key, {
        loop: true,
        volume: this.muted ? 0 : this.volume,
      });
      this.currentSound.play();
      this.currentKey = key;
    } else if (retry < 10) {
      // 音频还没加载完，500ms后重试
      this.scene.time.delayedCall(500, () => this.play(key, vol, retry + 1));
    } else {
      console.warn(`BGM "${key}" 加载超时`);
    }
  }

  /** 停止当前 BGM */
  stop(): void {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.destroy();
      this.currentSound = null;
      this.currentKey = null;
    }
  }

  /** 淡入切换 */
  crossFade(key: string, duration = 1000): void {
    if (this.currentSound) {
      this.scene.tweens.add({
        targets: this.currentSound,
        volume: 0,
        duration,
        onComplete: () => {
          this.stop();
          this.play(key);
        },
      });
    } else {
      this.play(key);
    }
  }

  private setupHotkeys(): void {
    // M = 静音
    this.scene.input.keyboard!.addKey('M').on('down', () => {
      this.muted = !this.muted;
      if (this.currentSound) {
        (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(this.muted ? 0 : this.volume);
      }
    });

    // - 减音量
    this.scene.input.keyboard!.addKey('MINUS').on('down', () => {
      this.volume = Math.max(0, this.volume - 0.05);
      if (!this.muted && this.currentSound) {
        (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(this.volume);
      }
    });

    // + 增音量
    this.scene.input.keyboard!.addKey('PLUS').on('down', () => {
      this.volume = Math.min(1, this.volume + 0.05);
      if (!this.muted && this.currentSound) {
        (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(this.volume);
      }
    });
  }

  get isPlaying(): boolean {
    return this.currentSound?.isPlaying ?? false;
  }

  /** 直接设置音量 */
  setVolume(vol: number): void {
    this.volume = vol;
    if (!this.muted && this.currentSound) {
      (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(vol);
    }
  }

  get currentVolume(): number {
    return this.volume;
  }
}
