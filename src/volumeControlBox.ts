import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { Playback } from './types';

interface VolumeControlBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  playback: Playback;
}

export class VolumeControlBox {
  element: b.Widgets.BoxElement;
  customEmitter: EventEmitter;
  volume: number | undefined;

  constructor(opts: VolumeControlBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      style: { focus: { border: { fg: 'green' } } },
      label: 'control',
    });

    this.customEmitter = opts.customEmitter;

    this.volume = opts.playback.device?.volume_percent;
    if (this.volume != null) this.updateVolumeText(this.volume);
    else this.updateVolumeText(0);

    this.element.key(['m', 'x', 'up', 'down', 'left', 'right'], (ch, key) => {
      if (this.volume == null) return;

      console.log('test');
    });
  }

  updateVolumeText(volume: number): void {
    if (volume < 0) volume = 0;
    else if (volume > 100) volume = 100;

    this.element.setLabel(`Volume: ${volume}%`);
  }
}
