export interface Word {
  id: number;
  english: string;
  chinese: string;
  add_date: string;
  correct_count: number;
  wrong_count: number;
  next_review: string | null;
  last_review: string | null;
  mastery_level: number;
  status: 'learning' | 'reviewing' | 'mastered';
}

export interface ReviewLog {
  id: number;
  word_id: number;
  review_date: string;
  is_correct: number;
  user_answer: string;
}

export interface ReviewStats {
  total: number;
  learning: number;
  reviewing: number;
  mastered: number;
  todayReviewed: number;
}

export interface WordFilter {
  status?: string;
  keyword?: string;
}

export type QuizMode = 'daily' | 'review' | 'random';
