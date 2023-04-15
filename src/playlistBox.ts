import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { SimplifiedPlaylist } from './types';

interface PlaylistBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  playlists?: SimplifiedPlaylist[];
}

export class PlaylistBox {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;
  selectedIndex: number = 0;
  playlists: SimplifiedPlaylist[] = [];

  constructor(opts: PlaylistBoxOptions) {
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
      label: 'playlists',
      keys: true,
    });

    this.customEmitter = opts.customEmitter;
    if (opts.playlists != null) this.playlists = opts.playlists;

    this.element.key(['r', 's'], (ch, key) => {});
  }

  init(playlists: SimplifiedPlaylist[]): void {
    this.element.key(['S-p', 'p', 'up', 'k', 'down', 'j'], (ch, key) => {});

    this.updateList(playlists);
  }

  updateList(playlists: SimplifiedPlaylist[]): void {
    const rows = playlists.map((playlist) => playlist.name);
    this.element.setItems(rows);
    this.setPlaylists(playlists);
  }

  setPlaylists(playlists: SimplifiedPlaylist[]): void {
    this.playlists = playlists;
  }
}
