import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { Album } from './types';

interface SearchResultBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
}

export class SearchResultBox {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;

  constructor(opts: SearchResultBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.list, {
      tags: true,
      scrollable: true,
      scrollbar: true,
      noCellBorders: true,
      interactive: true,
      vi: true,
      style: {
        selected: { bg: 'red' },
        scrollbar: { bg: 'blue' },
        focus: { border: { fg: 'green' } },
      },
      keys: true,
      label: 'results',
    });
    this.element.hide();

    this.customEmitter = opts.customEmitter;
  }

  show(): void {
    this.element.setIndex(200);
    this.element.show();
    this.element.focus();
  }

  showAlbumResults(albums: Album[]): void {
    this.element.setItems(albums.map((a) => a.name));
    this.show();
  }
}
