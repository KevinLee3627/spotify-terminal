import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { msToTime, bold } from './main';
import type { PlaybackControlBox } from './songControlBox';
import type { Playback, Track } from './types';
import type { VolumeControlBox } from './volumeControlBox';

interface SongBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  playback: Playback;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  controlBox: PlaybackControlBox;
  volumeBox: VolumeControlBox;
}

export class SongBox {
  // SONGBOX
  box: b.Widgets.BoxElement;
  progressBar: b.Widgets.ProgressBarElement;
  timeElapsed: b.Widgets.TextElement;
  songDuration: b.Widgets.TextElement;

  songProgressTimeout: NodeJS.Timeout = setTimeout(() => {}, 0);

  controlBox: PlaybackControlBox;
  volumeBox: VolumeControlBox;

  customEmitter: EventEmitter;
  constructor(opts: SongBoxOptions) {
    this.customEmitter = opts.customEmitter;

    this.box = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });

    this.progressBar = b.progressbar({
      left: '7',
      width: '100%-7',
      height: 1,
      orientation: 'horizontal',
      pch: '█',
    });

    this.controlBox = opts.controlBox;
    this.volumeBox = opts.volumeBox;

    this.timeElapsed = b.text({ left: '0', width: 5 });
    this.songDuration = b.text({ left: '100%-7' });

    this.box.append(this.progressBar);
    this.box.append(this.timeElapsed);
    this.box.append(this.songDuration);
    this.box.append(this.controlBox.element);
    this.box.append(this.volumeBox.element);
  }

  init(playback: Playback): void {
    this.box.key(['n', 'p', 'space', 'r'], (ch, key) => {
      // TODO: ADD DEVICE PICKER BOX
      // TODO: Finish this.

      switch (key.full) {
        case 'n':
          this.customEmitter.emit('skipToNext');
          break;
        case 'p':
          this.customEmitter.emit('skipToPrev');
          break;
        case 'r':
          this.customEmitter.emit('restartTrack');
          break;
        case 'space':
          this.customEmitter.emit('hitPlayButton');
          break;
        default:
          break;
      }
    });

    this.updateLabel(playback.item);
    void this.startProgress(
      playback.progress_ms,
      playback.item?.duration_ms ?? null,
      playback.is_playing
    );
  }

  updateLabel(track: Track | null): void {
    if (track == null) {
      this.box.setLabel('N/A');
      return;
    }
    const songTitle = track.name == null ? 'N/A' : track.name;
    const songArtist = track.album.artists.map((artist) => artist.name).join(', ');
    this.box.setLabel(`${bold(songTitle)} by ${songArtist}`);
  }

  setNullState(): void {
    this.box.setLabel('N/A');
  }

  async startProgress(
    progress: number | null,
    duration: number | null,
    isPlaying: boolean
  ): Promise<void> {
    clearTimeout(this.songProgressTimeout);

    if (progress == null || duration == null) {
      this.progressBar.setProgress(0);
      this.timeElapsed.setContent('00:00');
      this.songDuration.setContent('00:00');
      return;
    }

    if (isPlaying) {
      if (progress > duration) {
        // Get the new playback
        this.customEmitter.emit('songEnd');
      }
    }

    this.progressBar.setProgress((progress / duration) * 100);
    this.timeElapsed.setContent(msToTime(progress));
    this.songDuration.setContent(msToTime(duration));

    // Only advance the timer by 1 second if we are currently playing
    if (isPlaying) progress += 1000;

    this.songProgressTimeout = setTimeout(() => {
      void this.startProgress(progress, duration, isPlaying);
    }, 1000);
  }

  stopProgress(): void {
    clearTimeout(this.songProgressTimeout);
  }
}
