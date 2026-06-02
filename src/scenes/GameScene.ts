import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useWordStore, useQuizStore } from '../store/wordStore';
import { useAIStore } from '../store/aiStore';
import { useDramaStore } from '../store/dramaStore';
import { useHorrorStore } from '../store/horrorStore';
import { ScaleHelper } from '../utils/ScaleHelper';
import { HOTSPOTS, EASTER_EGGS, HORROR_TRIGGER, GAME_W, GAME_H, COLORS } from '../utils/Constants';
import { QuizSystem } from '../systems/main/QuizSystem';
import { VoiceSystem } from '../systems/main/VoiceSystem';

export class GameScene extends Phaser.Scene {
  private scaler!: ScaleHelper;
  private quizSystem!: QuizSystem;
  private voiceSystem!: VoiceSystem;

  // UI Elements
  private bgImage!: Phaser.GameObjects.Image;
  private wordDisplay!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private voiceStatus!: Phaser.GameObjects.Text;
  private petSprite!: Phaser.GameObjects.Image;
  private aiBubble!: Phaser.GameObjects.Container;

  // HTML input overlay for answer entry
  private answerInput!: HTMLInputElement;
  private answerInputElement!: Phaser.GameObjects.DOMElement;

  // State
  private hotspots: Map<string, Phaser.GameObjects.Zone> = new Map();
  private isNewGame: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { newGame: boolean }): void {
    this.isNewGame = data.newGame ?? false;
  }

  create(): void {
    useGameStore.getState().setPhase('game');
    this.scaler = new ScaleHelper(GAME_W, GAME_H);

    // --- Build UI ---
    this.createBackground();
    this.createHotspots();
    this.createDisplayElements();
    this.createAnswerInput();
    this.createPet();

    // --- Initialize Systems ---
    this.quizSystem = new QuizSystem(this);
    this.voiceSystem = new VoiceSystem(this);

    // --- Load data ---
    this.loadStats();
    this.updateModeDisplay();

    // --- Check for horror trigger on input ---
    this.setupHorrorTrigger();

    // --- Handle new game ---
    if (this.isNewGame) {
      this.startDramaSequence();
    }

    // Resize handler
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.scaler.updateSize(gameSize.width, gameSize.height);
      this.refreshUI();
    });
  }

  // ==================== UI Creation ====================

  private createBackground(): void {
    if (this.textures.exists('ui-bg')) {
      this.bgImage = this.add.image(0, 0, 'ui-bg').setOrigin(0).setDisplaySize(GAME_W, GAME_H);
    } else {
      this.cameras.main.setBackgroundColor(COLORS.bgBeige);
    }
  }

  private createHotspots(): void {
    Object.entries(HOTSPOTS).forEach(([key, hs]) => {
      const x = this.scaler.scaleX(hs.x + hs.w / 2);
      const y = this.scaler.scaleY(hs.y + hs.h / 2);
      const w = this.scaler.scaleW(hs.w);
      const h = this.scaler.scaleH(hs.h);

      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.setData('alpha', 0.001);

      zone.on('pointerover', () => {
        zone.setData('alpha', 0.05);
      });
      zone.on('pointerout', () => {
        zone.setData('alpha', 0.001);
      });

      this.hotspots.set(key, zone);
    });

    // Wire hotspot actions
    this.hotspots.get('wordbook')?.on('pointerdown', () => this.openWordbook());
    this.hotspots.get('ocr')?.on('pointerdown', () => this.openWordManager());
    this.hotspots.get('modeSwitch')?.on('pointerdown', () => this.cycleMode());
    this.hotspots.get('beginTest')?.on('pointerdown', () => this.startQuiz());
    this.hotspots.get('voice')?.on('pointerdown', () => this.speakWord());
    this.hotspots.get('submit')?.on('pointerdown', () => this.checkAnswer());
    this.hotspots.get('aiChat')?.on('pointerdown', () => this.openAIChat());
    this.hotspots.get('dramaViewer')?.on('pointerdown', () => this.openDramaViewer());
  }

  private createDisplayElements(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '24px',
      color: '#333333',
    };

    // Word display (center area)
    this.wordDisplay = this.add.text(GAME_W / 2, 200, '欢迎使用', {
      ...textStyle,
      fontSize: '36px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Result text
    this.resultText = this.add.text(GAME_W / 2, 300, '', {
      ...textStyle,
      fontSize: '20px',
    }).setOrigin(0.5);

    // Mode text
    this.modeText = this.add.text(GAME_W / 2, 120, '模式: 每日', {
      ...textStyle,
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5);

    // Stats text
    this.statsText = this.add.text(GAME_W - 20, 20, '', {
      ...textStyle,
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(1, 0);

    // Voice status
    this.voiceStatus = this.add.text(GAME_W - 20, GAME_H - 20, '🔊', {
      fontSize: '14px',
    }).setOrigin(1, 1);

    // AI chat bubble container
    this.aiBubble = this.add.container(GAME_W - 250, 200);
    this.updateAIBubble();
  }

  private createAnswerInput(): void {
    // Create HTML input element for answer entry
    this.answerInput = document.createElement('input');
    this.answerInput.type = 'text';
    this.answerInput.placeholder = '输入答案...';
    this.answerInput.style.cssText = `
      font-size: 22px;
      padding: 8px 16px;
      border: 2px solid #4a90d9;
      border-radius: 8px;
      background: rgba(255,255,255,0.9);
      width: 300px;
      text-align: center;
      outline: none;
    `;

    this.answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.checkAnswer();
      }
    });

    this.answerInputElement = this.add.dom(GAME_W / 2, 450, this.answerInput);
  }

  private createPet(): void {
    // Pet in bottom-right corner
    if (this.textures.exists('pet')) {
      this.petSprite = this.add.image(GAME_W - 80, GAME_H - 100, 'pet').setScale(1.5);
      this.petSprite.setInteractive({ useHandCursor: true });

      // Floating animation
      this.tweens.add({
        targets: this.petSprite,
        y: this.petSprite.y - 8,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      // Click pet multiple times to potentially trigger something
      let clickCount = 0;
      this.petSprite.on('pointerdown', () => {
        clickCount++;
        if (clickCount >= 5 && useHorrorStore.getState().unlocked) {
          this.time.delayedCall(500, () => this.enterHorrorGame());
          clickCount = 0;
        }
        // Reset click count after 2 seconds
        this.time.delayedCall(2000, () => { clickCount = 0; });
      });
    }
  }

  // ==================== Hotspot Actions ====================

  private openWordbook(): void {
    // Will be implemented as a popup overlay
    console.log('Open wordbook');
    this.showOverlay('单词本 - 开发中');
  }

  private openWordManager(): void {
    console.log('Open word manager');
    this.showOverlay('单词管理 - 开发中');
  }

  private cycleMode(): void {
    const store = useQuizStore.getState();
    const modes: Array<'daily' | 'review' | 'random'> = ['daily', 'review', 'random'];
    const currentIdx = modes.indexOf(store.mode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    useQuizStore.getState().setMode(nextMode);
    this.updateModeDisplay();
  }

  private async startQuiz(): Promise<void> {
    const mode = useQuizStore.getState().mode;
    const words = await window.electronAPI?.db.getWordsForReview(mode) ?? [];
    if (words.length === 0) {
      this.resultText.setText('没有可用的单词，请先添加单词！');
      return;
    }
    useQuizStore.getState().startQuiz(words, mode);
    this.showNextQuizWord();
  }

  private showNextQuizWord(): void {
    const state = useQuizStore.getState();
    if (!state.isActive || state.isFinished) return;

    const word = state.words[state.currentIndex];
    if (word) {
      this.wordDisplay.setText('?????');
      this.resultText.setText(`进度: ${state.currentIndex + 1} / ${state.totalCount}`);
      this.answerInput.value = '';
      this.answerInput.focus();

      // Optionally speak the word
      if (state.mode !== 'random') {
        this.voiceSystem?.speak(word.english);
      }
    }
  }

  private checkAnswer(): void {
    const state = useQuizStore.getState();
    if (!state.isActive || state.isWaiting) return;

    const answer = this.answerInput.value.trim();
    if (!answer) return;

    // Check for easter eggs
    const lowerAnswer = answer.toLowerCase();
    if (EASTER_EGGS[lowerAnswer]) {
      this.resultText.setText(`彩蛋: ${EASTER_EGGS[lowerAnswer]}`);
      this.addAILine(`你: ${answer}`);
      this.addAILine(`AI: ${EASTER_EGGS[lowerAnswer]}`);
      this.answerInput.value = '';
      return;
    }

    // Check for horror trigger
    if (lowerAnswer === HORROR_TRIGGER && useHorrorStore.getState().unlocked) {
      this.enterHorrorGame();
      return;
    }

    const isCorrect = useQuizStore.getState().submitAnswer(answer);
    const word = state.words[state.currentIndex];

    if (isCorrect) {
      this.resultText.setText(`✅ 正确！"${word.english}" = "${word.chinese}"`);
      this.flashScreen(COLORS.correctGreen, 0.2);
      // Record in database
      window.electronAPI?.db.recordReview(word.id, true, answer);
    } else {
      this.resultText.setText(`❌ 错误！"${word.english}" = "${word.chinese}"`);
      this.flashScreen(COLORS.wrongRed, 0.2);
      window.electronAPI?.db.recordReview(word.id, false, answer);
    }

    // Wait, then next word
    this.time.delayedCall(2000, () => {
      useQuizStore.getState().nextWord();
      if (useQuizStore.getState().isFinished) {
        this.showQuizResults();
      } else {
        this.showNextQuizWord();
      }
    });
  }

  private showQuizResults(): void {
    const state = useQuizStore.getState();
    const accuracy = state.totalCount > 0
      ? Math.round((state.correctCount / state.totalCount) * 100)
      : 0;

    this.wordDisplay.setText('测验完成！');
    this.resultText.setText(
      `正确: ${state.correctCount} / ${state.totalCount} (${accuracy}%)\n` +
      `错误: ${state.wrongCount} 个单词`
    );

    if (state.wrongWords.length > 0) {
      this.resultText.setText(
        this.resultText.text + '\n点击"提交"重做错词'
      );
    }

    this.loadStats();
  }

  private speakWord(): void {
    const state = useQuizStore.getState();
    if (state.isActive && state.words[state.currentIndex]) {
      this.voiceSystem?.speak(state.words[state.currentIndex].english);
    }
  }

  private openAIChat(): void {
    // Simple AI chat - will be expanded
    const question = this.answerInput.value.trim();
    if (!question) return;

    this.addAILine(`你: ${question}`);
    this.answerInput.value = '';

    // Call AI API
    this.callAI(question);
  }

  private async callAI(question: string): Promise<void> {
    useAIStore.getState().setResponding(true);
    this.resultText.setText('AI 思考中...');

    try {
      const aiStore = useAIStore.getState();
      const response = await fetch(`${aiStore.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiStore.apiKey}`,
        },
        body: JSON.stringify({
          model: aiStore.model,
          messages: [
            { role: 'system', content: aiStore.systemPrompt },
            ...aiStore.chatHistory.slice(-6),
            { role: 'user', content: question },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content ?? '(无响应)';

      useAIStore.getState().addMessage('user', question);
      useAIStore.getState().addMessage('assistant', reply);
      this.addAILine(`AI: ${reply}`);
      this.resultText.setText('');

      // Speak the reply
      this.voiceSystem?.speak(reply.substring(0, 100));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      useAIStore.getState().setError(msg);
      this.resultText.setText(`AI 请求失败: ${msg}`);
    } finally {
      useAIStore.getState().setResponding(false);
    }
  }

  private openDramaViewer(): void {
    this.startDramaSequence();
  }

  // ==================== Horror Trigger ====================

  private setupHorrorTrigger(): void {
    // The trigger is checked in checkAnswer() when user types 'nightmare'
  }

  private enterHorrorGame(): void {
    useGameStore.getState().enterHorror();
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('HorrorEntryScene');
    });
  }

  // ==================== Drama ====================

  private startDramaSequence(): void {
    useDramaStore.getState().setIsPlaying(true);
    useDramaStore.getState().setCurrentAct(1);
    this.scene.start('DramaScene', { actId: 1 });
  }

  // ==================== UI Helpers ====================

  private updateModeDisplay(): void {
    const modeNames: Record<string, string> = { daily: '每日', review: '复习', random: '随机' };
    const mode = useQuizStore.getState().mode;
    this.modeText.setText(`模式: ${modeNames[mode]}`);
  }

  private async loadStats(): Promise<void> {
    const stats = await window.electronAPI?.db.getReviewStats();
    if (stats) {
      useWordStore.getState().setStats(stats);
      this.statsText.setText(
        `总计: ${stats.total} | 学习: ${stats.learning} | 复习: ${stats.reviewing} | 精通: ${stats.mastered} | 今日: ${stats.todayReviewed}`
      );
    }
  }

  private addAILine(line: string): void {
    useAIStore.getState().addMessage(
      line.startsWith('你:') ? 'user' : 'assistant',
      line.replace(/^(你|AI): /, '')
    );
    this.updateAIBubble();
  }

  private updateAIBubble(): void {
    this.aiBubble?.removeAll(true);
    const lines = useAIStore.getState().qaLines.slice(-4);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-120, -lines.length * 18 - 15, 240, lines.length * 18 + 30, 8);
    bg.lineStyle(1, 0xcccccc, 1);
    bg.strokeRoundedRect(-120, -lines.length * 18 - 15, 240, lines.length * 18 + 30, 8);

    this.aiBubble.add(bg);

    lines.forEach((line, i) => {
      const shortLine = line.length > 25 ? line.substring(0, 25) + '...' : line;
      const t = this.add.text(-110, -lines.length * 15 + i * 18 + 5, shortLine, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: '#333333',
      });
      this.aiBubble.add(t);
    });
  }

  private flashScreen(color: number, alpha: number): void {
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, color, alpha).setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  private showOverlay(msg: string): void {
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, 600, 400, 0x000000, 0.85).setDepth(200);
    const text = this.add.text(GAME_W / 2, GAME_H / 2, msg, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    overlay.setInteractive();
    overlay.on('pointerdown', () => {
      overlay.destroy();
      text.destroy();
    });
  }

  private refreshUI(): void {
    // Update all UI elements based on new size
    // Will be fully implemented when assets are in place
  }
}
