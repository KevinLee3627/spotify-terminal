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
  searchType: SearchType;

  constructor(opts: SearchBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.textbox, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
      inputOnFocus: true,
    });
    this.element.set('id', 'searchBox');

    this.searchType = 'track';

    this.setLabel(this.searchType);

    this.customEmitter = opts.customEmitter;

    this.element.on('submit', (val: string) => {
      if (val == null || val.length <= 0) return;
      this.customEmitter.emit('search', val, this.searchType);
    });

    this.element.on('cancel', () => {
      // Completely clear focus when escaping text input focus
      while (this.element.screen.focused != null) {
        this.element.screen.focusPop();
      }
    });

    this.element.key(['C-a', 'C-t', 'C-l', 'C-x'], (ch, key) => {
      switch (key.full) {
        case 'C-a':
          this.setSearchType('album');
          break;
        case 'C-t':
          this.setSearchType('track');
          break;
        case 'C-l':
          this.setSearchType('album');
          break;
        case 'C-x':
          this.element.clearValue();
          break;
        default:
          break;
      }
      this.setLabel(this.searchType);
    });
  }

  setLabel(searchTypes: SearchType): void {
    this.element.setLabel(`search: ${searchTypes}`);
  }

  setSearchType(type: SearchType): void {
    this.searchType = type;
  }
}
