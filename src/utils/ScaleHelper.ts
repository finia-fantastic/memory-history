import { BASE_W, BASE_H } from './Constants';

export class ScaleHelper {
  private currentW: number;
  private currentH: number;

  constructor(w: number, h: number) {
    this.currentW = w;
    this.currentH = h;
  }

  updateSize(w: number, h: number): void {
    this.currentW = w;
    this.currentH = h;
  }

  scaleX(baseX: number): number {
    return (baseX / BASE_W) * this.currentW;
  }

  scaleY(baseY: number): number {
    return (baseY / BASE_H) * this.currentH;
  }

  scaleW(baseW: number): number {
    return (baseW / BASE_W) * this.currentW;
  }

  scaleH(baseH: number): number {
    return (baseH / BASE_H) * this.currentH;
  }

  scalePoint(baseX: number, baseY: number): { x: number; y: number } {
    return { x: this.scaleX(baseX), y: this.scaleY(baseY) };
  }
}
