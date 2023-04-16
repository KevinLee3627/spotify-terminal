import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { SearchType } from './spotify';
import type { Album, Track } from './types';

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
  resultType: SearchType = 'track';

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

    this.element.key(['h'], (ch, key) => {
      switch (key.full) {
        case 'h':
          this.element.hide();
          break;

        default:
          break;
      }
    });
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

  showTrackResults(tracks: Track[]): void {
    this.element.setItems(
      tracks.map((t) => `${t.name} by ${t.artists.map((a) => a.name).join(', ')}`)
    );
    this.show();
  }

  setResultType(type: SearchType): void {
    this.resultType = type;
  }
}
