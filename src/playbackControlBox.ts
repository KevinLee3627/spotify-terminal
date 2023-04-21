import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { writeFileSync } from 'fs';
import { bold } from './util';
import type { Playback } from './types';

interface PlaybackControlBoxOptions {
  top: number;
  left: number;
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

  shuffleText: b.Widgets.TextElement;
  currentShuffleState: Playback['shuffle_state'];

  constructor(opts: PlaybackControlBoxOptions) {
    // this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
    //   style: { focus: { border: { fg: 'green' } } },
    //   label: 'control',
    // });
    this.element = b.box({
      style: { focus: { border: { fg: 'green' } } },
      label: 'control',
      width: opts.width,
      height: opts.height,
      top: opts.top,
      left: opts.left,
      border: 'line',
    });
    this.customEmitter = opts.customEmitter;
    this.element.set('id', 'songControlBox');

    this.currentRepeatState = opts.playback.repeat_state;
    this.currentShuffleState = opts.playback.shuffle_state;

    this.repeatText = b.text({ tags: true });
    this.element.append(this.repeatText);
    this.updateRepeatText(opts.playback.repeat_state);

    this.shuffleText = b.text({
      tags: true,
      // NOTE: APPARENTLY only integers are allowed...
      left: Math.floor((this.element.width as number) / 2),
    });
    this.element.append(this.shuffleText);
    this.updateShuffleText(opts.playback.shuffle_state);

    this.element.key(['r', 's'], (ch, key) => {
      if (key.full === 'r') {
        this.cycleRepeatState();
      }

      if (key.full === 's') {
        this.toggleShuffle();
      }
    });

    this.customEmitter.on('updatePlaybackControlBox', (playback: Playback) => {
      this.updateShuffleText(playback.shuffle_state);
      this.setShuffleState(playback.shuffle_state);
      this.updateRepeatText(playback.repeat_state);
      this.setRepeatState(playback.repeat_state);
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

  updateShuffleText(state: Playback['shuffle_state']): void {
    this.shuffleText.setContent(`${bold('(s)')}huffle: ${state ? 'on' : 'off'}`);
  }

  toggleShuffle(): void {
    this.customEmitter.emit('toggleShuffle', this.currentShuffleState);
    writeFileSync(
      './settings.json',
      JSON.stringify({ onStartShuffleState: !this.currentShuffleState })
    );
    this.updateShuffleText(!this.currentShuffleState);
    this.setShuffleState(!this.currentShuffleState);
  }

  setShuffleState(state: Playback['shuffle_state']): void {
    this.currentShuffleState = state;
  }
}
