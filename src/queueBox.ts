import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { cutoff, msToTime } from './main';
import type { Track } from './types';

interface QueueBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  queue?: Track[];
}

export class QueueBox {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;
  selectedIndex: number = 0;

  constructor(opts: QueueBoxOptions) {
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
      label: 'up next',
      keys: true,
    });

    this.customEmitter = opts.customEmitter;

    this.customEmitter.on('updateQueueBox', (queue: Track[]) => {
      this.updateList(queue);
    });

    this.element.key(['r', 's'], (ch, key) => {});
  }

  init(queue: Track[]): void {
    this.element.key(['S-p', 'p', 'up', 'k', 'down', 'j'], (ch, key) => {
      // TODO: Remove song from queue - impossible through API?
      switch (key.full) {
        case 'up':
        case 'k':
          if (this.selectedIndex <= 0) return;
          this.selectedIndex--;
          break;
        case 'down':
        case 'j':
          if (this.selectedIndex >= 20) return;
          this.selectedIndex++;
          break;
        default:
          break;
      }
    });

    this.updateList(queue);
  }

  updateList(tracks: Track[]): void {
    const listWidth = this.element.width as number;
    const totalBorderWidth = 2;
    const queueNumWidth = 2;
    const durationWidth = 9;

    const trackNameWidth = listWidth - totalBorderWidth - queueNumWidth - durationWidth;
    function formatRow(track: Track, index: number): string {
      const trackNameCol = cutoff(track.name.padEnd(trackNameWidth, ' '), trackNameWidth);
      const trackNumCol = String(index + 1).padEnd(queueNumWidth, ' ');
      const durationCol = msToTime(track.duration_ms).padEnd(durationWidth, ' ');
      return `${trackNumCol} ${trackNameCol} ${durationCol}`;
    }
    const rows = tracks.map((track, i) => {
      return formatRow(track, i);
    });
    this.element.setItems(rows);
  }
}
