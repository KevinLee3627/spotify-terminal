import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { msToTime, bold } from './main';
import type { Playback, Track } from './types';

interface SongBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  playback: Playback;
  grid: bc.Widgets.GridElement;
  statusEmitter: EventEmitter;
}

export class SongBox {
  // SONGBOX
  box: b.Widgets.BoxElement;
  progressBar: b.Widgets.ProgressBarElement;
  timeElapsed: b.Widgets.TextElement;
  songDuration: b.Widgets.TextElement;

  songProgressTimeout: NodeJS.Timeout = setTimeout(() => {}, 0);

  statusEmitter: EventEmitter;
  constructor(opts: SongBoxOptions) {
    this.statusEmitter = opts.statusEmitter;

    this.box = opts.grid.set(opts.row, opts.col, opts.height, opts.width, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });

    this.progressBar = b.progressbar({
      left: '7',
      width: '100%-14',
      orientation: 'horizontal',
      pch: '█',
      filled: 50,
    });
    this.timeElapsed = b.text({ left: '0' });
    this.songDuration = b.text({ left: '100%-7' });

    this.box.append(this.progressBar);
    this.box.append(this.timeElapsed);
    this.box.append(this.songDuration);

    this.updateLabel(opts.playback.item);
    void this.updateProgress(
      opts.playback.progress_ms,
      opts.playback.item?.duration_ms ?? null,
      opts.playback.is_playing
    );
  }

  updateLabel(track: Track | null): void {
    if (track == null) {
      this.box.setLabel('N/A');
      return;
    }
    const songTitle = track.name == null ? 'N/A' : track.name;
    const songArtist = track.album.artists.map((artist) => artist.name).join(', ');
    const albumName = track.album.name;
    const albumYear = track.album.release_date.split('-')[0];
    this.box.setLabel(
      `${bold(songTitle)} by ${songArtist} | ${albumName} (${albumYear})`
    );
  }

  async updateProgress(
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
      if (progress >= duration) {
        // Get the new playback
        this.statusEmitter.emit('songEnd');
      }
    }

    this.progressBar.setProgress((progress / duration) * 100);
    this.timeElapsed.setContent(msToTime(progress));
    this.songDuration.setContent(msToTime(duration));
    this.songProgressTimeout = setTimeout(() => {
      void this.updateProgress(progress + 1000, duration, isPlaying);
    }, 1000);
  }
}
