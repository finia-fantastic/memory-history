import { create } from 'zustand';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIState {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  chatHistory: ChatMessage[];
  qaLines: string[];
  isResponding: boolean;
  lastError: string | null;

  setConfig: (config: Partial<Pick<AIState, 'apiKey' | 'baseUrl' | 'model' | 'systemPrompt'>>) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setResponding: (v: boolean) => void;
  setError: (err: string | null) => void;
  clearHistory: () => void;
}

const DEFAULT_SYSTEM_PROMPT = '你是一个友好的二次元英语学习助手，回答简洁、温柔、清楚。';

export const useAIStore = create<AIState>((set) => ({
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  chatHistory: [],
  qaLines: [],
  isResponding: false,
  lastError: null,

  setConfig: (config) => set((s) => ({ ...s, ...config })),
  addMessage: (role, content) =>
    set((s) => {
      const newHistory = [...s.chatHistory, { role, content }].slice(-20);
      const newQaLines = [
        ...s.qaLines,
        `${role === 'user' ? '你' : 'AI'}: ${content}`,
      ].slice(-8);
      return { chatHistory: newHistory, qaLines: newQaLines };
    }),
  setResponding: (v) => set({ isResponding: v }),
  setError: (err) => set({ lastError: err }),
  clearHistory: () => set({ chatHistory: [], qaLines: [] }),
}));
