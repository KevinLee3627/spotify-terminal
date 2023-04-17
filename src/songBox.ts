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
  element: b.Widgets.BoxElement;
  progressBar: b.Widgets.ProgressBarElement;
  timeElapsed: b.Widgets.TextElement;
  songDuration: b.Widgets.TextElement;
  currentPlayback: Playback;

  songProgressTimeout: NodeJS.Timeout = setTimeout(() => {}, 0);

  controlBox: PlaybackControlBox;
  volumeBox: VolumeControlBox;

  customEmitter: EventEmitter;
  constructor(opts: SongBoxOptions) {
    this.currentPlayback = opts.playback;
    this.customEmitter = opts.customEmitter;

    this.element = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });
    this.element.set('id', 'songBox');

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

    this.element.append(this.progressBar);
    this.element.append(this.timeElapsed);
    this.element.append(this.songDuration);
    this.element.append(this.controlBox.element);
    this.element.append(this.volumeBox.element);

    this.element.key(['n', 'p', 'space', 'r', 'l', 'C-a'], (ch, key) => {
      // TODO: ADD DEVICE PICKER BOX

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
        case 'l':
          this.customEmitter.emit('toggleTrackLikeStatus', this.currentPlayback.item);
          break;
        case 'C-a':
          if (this.currentPlayback.item != null)
            this.customEmitter.emit('addToPlaylistModal', this.currentPlayback.item);
          break;
        default:
          break;
      }
    });

    this.updateLabel(opts.playback.item);
    void this.startProgress(
      opts.playback.progress_ms,
      opts.playback.item?.duration_ms ?? null,
      opts.playback.is_playing
    );
  }

  updateLabel(track: Track | null, liked = false): void {
    if (track == null) {
      this.element.setLabel('N/A');
      return;
    }
    const songTitle = track.name == null ? 'N/A' : track.name;
    const songArtist = track.album.artists.map((artist) => artist.name).join(', ');
    this.element.setLabel(`${bold(songTitle)} by ${songArtist} ${liked ? '♥' : ''}`);
  }

  setNullState(): void {
    this.element.setLabel('N/A');
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

  setCurrentPlayback(playback: Playback): void {
    this.currentPlayback = playback;
  }
}
