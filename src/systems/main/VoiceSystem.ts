export class VoiceSystem {
  private scene: Phaser.Scene;
  private isSpeaking: boolean = false;
  private available: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.checkAvailability();
  }

  private checkAvailability(): void {
    this.available = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (!this.available) {
      console.warn('Web Speech API not available');
    }
  }

  speak(text: string, rate: number = 0.9, pitch: number = 1.0): void {
    if (!this.available || this.isSpeaking) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.8;

    // Try to use a female English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
      ?? voices.find(v => v.lang.startsWith('en'))
      ?? voices[0];

    if (enVoice) {
      utterance.voice = enVoice;
    }

    this.isSpeaking = true;
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  speakWord(word: string): void {
    this.speak(word, 0.85, 1.0);
  }

  speakChinese(text: string): void {
    if (!this.available) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.available) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }
}
