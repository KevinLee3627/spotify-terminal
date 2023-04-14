import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { bold } from './main';
import type { Playback } from './types';

interface PlaybackControlBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  playback: Playback;
}

export class PlaybackControlBox {
  element: b.Widgets.BoxElement;
  customEmitter: EventEmitter;
  repeatText: b.Widgets.TextElement;
  repeatStateOptions: Array<Playback['repeat_state']> = ['off', 'track', 'context'];
  currentRepeatState: Playback['repeat_state'];

  constructor(opts: PlaybackControlBoxOptions) {
    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      style: { focus: { border: { fg: 'green' } } },
      label: 'control',
    });

    this.customEmitter = opts.customEmitter;

    this.currentRepeatState = opts.playback.repeat_state;

    this.repeatText = b.text({ tags: true });
    this.element.append(this.repeatText);
    this.updateRepeatText(opts.playback.repeat_state);

    this.element.key(['r', 's'], (ch, key) => {
      if (key.full === 'r') {
        this.cycleRepeatState();
      }
    });
  }

  updateRepeatText(state: Playback['repeat_state']): void {
    this.repeatText.setContent(`${bold('(r)')}epeat: ${state}`);
  }

  cycleRepeatState(): void {
    const currentStateIndex = this.repeatStateOptions.indexOf(this.currentRepeatState);
    const nextStateIndex = (currentStateIndex + 1) % this.repeatStateOptions.length;
    this.customEmitter.emit('cycleRepeatState', this.repeatStateOptions[nextStateIndex]);
  }

  setRepeatState(state: Playback['repeat_state']): void {
    this.currentRepeatState = state;
  }
}
