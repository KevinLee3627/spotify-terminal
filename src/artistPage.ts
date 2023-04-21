import type EventEmitter from 'events';
import * as b from 'blessed';
import type bc from 'blessed-contrib';

interface ArtistPageOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
}

export class ArtistPage {
  element: b.Widgets.BoxElement;

  constructor(opts: ArtistPageOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });

    this.element.key(['a'], (ch, key) => {
      switch (key.full) {
        case 'a':
          this.element.setContent(`It is not ${new Date().toISOString()}`);
          break;

        default:
          break;
      }
    });
  }
}
