import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';

interface SearchBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
}

export class SearchBox {
  element: b.Widgets.BoxElement;

  constructor(opts: SearchBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });
  }

  init(): void {
    this.element.setLabel('search');
  }
}
