import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import type { Playback } from './types';

interface VolumeControlBoxOptions {
  top: number;
  left: number;
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
  bar: b.Widgets.ProgressBarElement;

  constructor(opts: VolumeControlBoxOptions) {
    this.element = b.box({
      style: { focus: { border: { fg: 'green' } } },
      label: 'control',
      height: opts.height,
      width: opts.width,
      top: opts.top,
      left: opts.left,
      border: 'line',
    });
    this.element.set('id', 'volumeControlBox');

    this.bar = b.progressbar({
      width: '100%-2',
      orientation: 'horizontal',
      pch: '█',
    });
    this.element.append(this.bar);

    this.customEmitter = opts.customEmitter;

    this.volume = opts.playback.device?.volume_percent;
    if (this.volume != null) this.updateVolumeText(this.volume);
    else this.updateVolumeText(0);

    this.element.key(['m', 'x', 'up', 'down', 'left', 'right'], (ch, key) => {
      if (this.volume == null) return;

      switch (key.full) {
        case 'up':
        case 'right':
          this.customEmitter.emit('setVolume', this.volume + 10);
          this.setVolume(this.volume + 10);
          break;
        case 'down':
        case 'left':
          this.customEmitter.emit('setVolume', this.volume - 10);
          this.setVolume(this.volume - 10);
          break;
        case 'm':
          this.customEmitter.emit('setVolume', 0);
          this.setVolume(0);
          break;
        case 'x':
          this.customEmitter.emit('setVolume', 100);
          this.setVolume(100);
          break;
        default:
          break;
      }
    });
  }

  updateVolumeText(volume: number): void {
    if (volume < 0) volume = 0;
    else if (volume > 100) volume = 100;

    this.element.setLabel(`Volume: ${volume}%`);
    this.bar.setProgress(volume);
  }

  setVolume(volume: number): void {
    if (volume < 0) volume = 0;
    else if (volume > 100) volume = 100;

    this.volume = volume;
  }
}
