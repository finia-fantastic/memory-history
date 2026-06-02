import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useAIStore } from '../store/aiStore';
import { GAME_W, GAME_H } from '../utils/Constants';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    useGameStore.getState().setPhase('settings');

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(GAME_W / 2, 40, '设置', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // AI Settings section
    let yPos = 100;
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#aaaacc',
    };

    // API Key
    this.add.text(100, yPos, 'DeepSeek API Key:', labelStyle);
    this.createTextInput(350, yPos - 8, 500, useAIStore.getState().apiKey, 'password', (val) => {
      useAIStore.getState().setConfig({ apiKey: val });
    });
    yPos += 50;

    // Base URL
    this.add.text(100, yPos, 'API Base URL:', labelStyle);
    this.createTextInput(350, yPos - 8, 500, useAIStore.getState().baseUrl, 'text', (val) => {
      useAIStore.getState().setConfig({ baseUrl: val });
    });
    yPos += 50;

    // Model
    this.add.text(100, yPos, 'Model:', labelStyle);
    this.createTextInput(350, yPos - 8, 500, useAIStore.getState().model, 'text', (val) => {
      useAIStore.getState().setConfig({ model: val });
    });
    yPos += 50;

    // System Prompt
    this.add.text(100, yPos, 'System Prompt:', labelStyle);
    const promptInput = this.createTextInput(350, yPos - 8, 500, useAIStore.getState().systemPrompt, 'text', (val) => {
      useAIStore.getState().setConfig({ systemPrompt: val });
    });
    promptInput.style.height = '60px';
    yPos += 80;

    // Save button
    this.createButton(GAME_W / 2, yPos + 40, '保存并返回', () => {
      this.scene.start('TitleScene');
    });

    // Back button
    this.createButton(GAME_W / 2, yPos + 100, '取消', () => {
      this.scene.start('TitleScene');
    });
  }

  private createTextInput(
    x: number, y: number, w: number,
    defaultValue: string,
    type: string,
    onChange: (val: string) => void
  ): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.value = defaultValue;
    input.style.cssText = `
      width: ${w}px;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid #4a4a6a;
      border-radius: 4px;
      background: #2a2a3e;
      color: #ffffff;
      outline: none;
    `;
    input.addEventListener('change', () => onChange(input.value));
    this.add.dom(x + w / 2, y + 12, input);
    return input;
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x4a90d9, 1);
    bg.fillRoundedRect(x - 100, y - 18, 200, 36, 6);

    this.add.text(x, y, label, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 200, 36).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', callback);
  }
}
