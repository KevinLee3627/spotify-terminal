import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { SimplifiedPlaylist, Track } from './types';

interface PlaylistAddModalOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  playlists: SimplifiedPlaylist[];
  track: Track;
}

export class PlaylistAddModal {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;
  selectedIndex: number = 0;
  playlists: SimplifiedPlaylist[] = [];
  track: Track;

  constructor(opts: PlaylistAddModalOptions) {
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
    this.element.set('id', 'playlistAddModal]');

    this.customEmitter = opts.customEmitter;
    this.playlists = opts.playlists;
    this.updateList(this.playlists);
    this.track = opts.track;

    this.element.key(['up', 'k', 'down', 'j', 'enter', 'h', 'd'], (ch, key) => {
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
        case 'enter':
          this.customEmitter.emit(
            'addTrackToPlaylist',
            this.playlists[this.selectedIndex],
            this.track
          );
          break;
        case 'd':
          this.customEmitter.emit(
            'deleteTrackFromPlaylist',
            this.playlists[this.selectedIndex],
            this.track
          );
          break;
        case 'h':
          this.element.destroy();
          break;
        default:
          break;
      }
    });
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
