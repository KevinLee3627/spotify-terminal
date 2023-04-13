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
  element: b.Widgets.TextboxElement;

  constructor(opts: SearchBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.textbox, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
      inputOnFocus: true,
    });

    // this.element.on('focus', () => {
    //   console.log('focused');
    //   this.element.readInput((err, val) => {
    //     if (err != null) console.log(err);
    //     console.log(val);
    //   });
    // });

    this.element.on('submit', (val) => {
      // console.log(`submitted ${this.element.getValue()}`);
      // this.element.clearValue();
    });
  }

  init(): void {
    this.element.setLabel('search');
  }
}
