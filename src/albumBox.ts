import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { msToTime, bold } from './main';
import type { AlbumFull, Track } from './types';

interface AlbumBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
}

export class AlbumBox {
  element: b.Widgets.ListElement;
  selectedAlbumTrackIndex: number = 0;

  constructor(opts: AlbumBoxOptions) {
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
      keys: true,
    });
  }

  init(album: AlbumFull, currentTrack: Track | null): void {
    this.updateLabel(album);
    this.updateList(album.tracks.items);
    if (currentTrack != null) this.selectCurrentlyPlaying(currentTrack);
  }

  updateLabel(album: AlbumFull | null): void {
    // TODO: Dynamic height based on # of tracks in album?
    if (album == null) {
      this.element.setLabel('No album playing.');
      return;
    }
    this.element.setLabel(`${bold(album.name)} (${album.release_date})`);
  }

  updateList(tracks: Track[]): void {
    const listWidth = this.element.width as number;
    const totalBorderWidth = 2;
    const trackNumWidth = 2;
    const durationWidth = 9;

    const trackNameWidth = listWidth - totalBorderWidth - trackNumWidth - durationWidth;
    function formatRow(track: Track): string {
      const trackNameCol = track.name.padEnd(trackNameWidth, ' ');
      const trackNumCol = String(track.track_number).padEnd(trackNumWidth, ' ');
      const durationCol = msToTime(track.duration_ms).padEnd(durationWidth, ' ');
      return `${trackNumCol} ${trackNameCol} ${durationCol}`;
    }
    const rows = tracks.map((track) => {
      return formatRow(track);
    });
    this.element.setItems(rows);
  }

  selectCurrentlyPlaying(track: Track): void {
    // Select the currently playing track
    this.element.select(track.track_number - 1);
    this.selectedAlbumTrackIndex = track.track_number - 1;
  }
}
