export interface SubtitleItem {
  text: string;
  x: number;
  y: number;
}

export interface IntroSlide {
  key: string;
  name: string;
  steps: SubtitleItem[][];
}
