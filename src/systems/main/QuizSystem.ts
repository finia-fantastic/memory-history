import Phaser from 'phaser';
import { useQuizStore } from '../../store/wordStore';
import type { Word, QuizMode } from '../../types/word';

export class QuizSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getWordsForMode(mode: QuizMode, words: Word[]): Word[] {
    const today = new Date().toISOString().split('T')[0];

    switch (mode) {
      case 'daily':
        return words
          .filter(w => w.status !== 'mastered' && (w.next_review ?? '') <= today)
          .sort((a, b) => a.correct_count - b.correct_count)
          .slice(0, 15);
      case 'review':
        return words
          .filter(w => w.status === 'reviewing' && (w.next_review ?? '') <= today)
          .sort((a, b) => a.correct_count - b.correct_count)
          .slice(0, 15);
      case 'random':
        return words
          .filter(w => w.status === 'mastered')
          .sort(() => Math.random() - 0.5)
          .slice(0, 15);
      default:
        return [];
    }
  }

  checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }

  calculateNextReview(correctCount: number, masteryLevel: number, isCorrect: boolean): {
    newMastery: number;
    newStatus: string;
    nextReviewDays: number;
  } {
    if (isCorrect) {
      const newMastery = Math.min(masteryLevel + 1, 6);
      let newStatus = 'learning';
      if (newMastery >= 5) newStatus = 'mastered';
      else if (newMastery >= 2) newStatus = 'reviewing';
      const days = newStatus === 'mastered' ? 30 : 1;
      return { newMastery, newStatus, nextReviewDays: days };
    } else {
      const newMastery = Math.max(masteryLevel - 1, 0);
      return { newMastery, newStatus: 'learning', nextReviewDays: 0 };
    }
  }

  getAccuracy(correct: number, total: number): number {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }
}
