import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { bold } from './util';
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
    this.element.set('id', 'playlistBox');

    this.customEmitter = opts.customEmitter;
    if (opts.playlists != null) {
      this.playlists = opts.playlists;
      this.updateList(this.playlists);
    }
    this.element.key(['p', 'up', 'k', 'down', 'j'], (ch, key) => {
      switch (key.full) {
        case 'up':
        case 'k':
          if (this.selectedIndex <= 0) return;
          this.selectedIndex--;
          break;
        case 'down':
        case 'j':
          if (this.selectedIndex >= this.playlists.length) return;
          this.selectedIndex++;
          break;
        case 'p':
          this.customEmitter.emit('playPlaylist', this.playlists[this.selectedIndex]);
          break;
        default:
          break;
      }
    });
  }

  updateList(
    playlists: SimplifiedPlaylist[],
    currentPlaylistUri?: SimplifiedPlaylist['uri']
  ): void {
    const rows = playlists.map((playlist) => {
      return playlist.name;
    });
    this.element.setItems(rows);

    if (currentPlaylistUri != null) {
      const currentPlaylist = playlists.find((p) => p.uri === currentPlaylistUri);
      if (currentPlaylist != null) {
        this.element.setLabel(`playlists (playing ${bold(currentPlaylist?.name)})`);
      }
    } else {
      this.element.setLabel('playlists');
    }

    this.setPlaylists(playlists);
  }

  setPlaylists(playlists: SimplifiedPlaylist[]): void {
    this.playlists = playlists;
  }
}
