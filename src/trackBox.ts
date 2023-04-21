import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { cutoff, msToTime } from './util';
import type { Track } from './types';

export interface TrackBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  label: string;
  tracks?: Track[];
  likedMapping?: Record<string, boolean>;
}

export class TrackBox {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;
  tracks: Track[] = [];
  selectedIndex: number = 0;

  constructor(opts: TrackBoxOptions) {
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
      label: opts.label,
      keys: true,
    });

    this.customEmitter = opts.customEmitter;

    if (opts.tracks != null && opts.likedMapping != null) {
      this.setTracks(opts.tracks);
      this.updateList(opts.tracks, opts.likedMapping);
    }

    // Track selected index for any descendants that want to have custom hotkeys
    // instead of just doing something on select
    this.element.key(['up', 'down', 'k', 'j'], (ch, key) => {
      switch (key.full) {
        case 'up':
        case 'k':
          if (this.selectedIndex <= 0) return;
          this.selectedIndex--;
          break;
        case 'down':
        case 'j':
          if (this.selectedIndex >= this.tracks.length - 1) return;
          this.selectedIndex++;
          break;
        default:
          break;
      }
    });
    this.element.on('select', (item, i) => {
      this.customEmitter.emit('playTrack', this.tracks[i].uri);
    });
  }

  updateList(tracks: Track[], likedMapping: Record<string, boolean>): void {
    const rows = tracks.map((track, i) => {
      return this.formatRow(track, i, likedMapping[track.id]);
    });
    this.element.setItems(rows);
  }

  formatRow(track: Track, index: number, liked: boolean): string {
    const listWidth = this.element.width as number;
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

  setLabel(label: string): void {
    this.element.setLabel(label);
  }

  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
  }
}
