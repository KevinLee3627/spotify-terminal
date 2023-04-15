import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { SearchType } from './spotify';

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
  customEmitter: EventEmitter;
  searchType: SearchType[];

  constructor(opts: SearchBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.textbox, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
      inputOnFocus: true,
    });

    this.searchType = ['album', 'track'];

    this.setLabel(this.searchType);

    this.customEmitter = opts.customEmitter;

    this.element.on('submit', (val: string) => {
      this.customEmitter.emit('search', val, this.searchType);
    });

    this.element.key(['C-a', 'C-t', 'C-l'], (ch, key) => {
      console.log(key.full);
      switch (key.full) {
        case 'C-a':
          this.setSearchType(['album']);
          break;
        case 'C-t':
          this.setSearchType(['track']);
          break;
        case 'C-l':
          this.setSearchType(['album', 'track']);
          break;
        default:
          break;
      }
    });
  }

  setLabel(searchTypes: SearchType[]): void {
    this.element.setLabel(`search: ${searchTypes.join(', ')}`);
  }

  setSearchType(type: SearchType[]): void {
    this.searchType = type;
  }
}
