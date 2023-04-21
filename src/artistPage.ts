import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { Page } from './page';
import type { Artist, Track } from './types';
import { cutoff, msToTime } from './util';

interface ArtistPageOptions {
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  artist: Artist;
  topTracks: Track[];
  topTracksLiked: Record<string, boolean>;
}
export class ArtistPage {
  customEmitter: EventEmitter;
  artist: Artist;
  page: Page;
  topTracksBox: b.Widgets.ListElement;

  constructor(opts: ArtistPageOptions) {
    this.artist = opts.artist;

    this.topTracksBox = opts.grid.set(0, opts.gridWidth / 2, 12, opts.gridWidth / 2, b.list, {
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
      label: 'top tracks',
    });

    this.topTracksBox.setItems(
      opts.topTracks.map((t, i) => this.formatRow(t, i, opts.topTracksLiked[t.id]))
    );
    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [this.topTracksBox],
    });

    this.customEmitter = opts.customEmitter;
    this.customEmitter.on('artistPageHotkey', (key: string) => {
      switch (key) {
        case 't':
          this.topTracksBox.focus();
          break;
        case ':':
          this.customEmitter.emit('setActivePage', 'home');
          break;
        default:
          break;
      }
    });
  }

  formatRow(track: Track, index: number, liked: boolean): string {
    const listWidth = this.topTracksBox.width as number;
    const totalBorderWidth = 2;
    const totalPaddingWidth = 3; // 4 columns, 1 col of padding between each column
    const trackNumWidth = 2;
    const durationWidth = 5;
    const likedColWidth = 2;

    const trackNameWidth =
      listWidth -
      totalBorderWidth -
      totalPaddingWidth -
      trackNumWidth -
      durationWidth -
      likedColWidth;
    const trackNameCol = cutoff(track.name.padEnd(trackNameWidth, ' '), trackNameWidth);
    const trackNumCol = String(index + 1).padEnd(trackNumWidth, ' ');
    const durationCol = msToTime(track.duration_ms).padEnd(durationWidth, ' ');
    const likedCol = liked ? '♥' : '';

    return `${trackNumCol} ${trackNameCol} ${durationCol} ${likedCol}`;
  }
}
