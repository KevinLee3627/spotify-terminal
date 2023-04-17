import * as b from 'blessed';
import type bc from 'blessed-contrib';
interface ToastOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  content: string;
  grid: bc.Widgets.GridElement;
  lifetime?: number;
}

export class Toast {
  element: b.Widgets.TextElement;

  constructor(opts: ToastOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.text, {
      tags: true,
      content: opts.content,
    });

    this.destroy(opts.lifetime ?? 5000);
  }

  destroy(delay: number): void {
    setTimeout(() => {
      this.element.destroy();
    }, delay);
  }
}
