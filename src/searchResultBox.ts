import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { cutoff, msToTime } from './main';
import type { SearchType } from './spotify';
import type { Album, Track } from './types';

interface SearchResultBoxOptions {
  row: number;
  col: number;
  width: number;
  height: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
}

export class SearchResultBox {
  element: b.Widgets.ListElement;
  customEmitter: EventEmitter;
  resultType: SearchType = 'track';

  constructor(opts: SearchResultBoxOptions) {
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
      label: 'results',
    });
    this.element.hide();

    this.customEmitter = opts.customEmitter;

    this.element.key(['h'], (ch, key) => {
      switch (key.full) {
        case 'h':
          this.element.hide();
          break;

        default:
          break;
      }
    });
  }

  show(): void {
    this.element.setIndex(200);
    this.element.show();
    this.element.focus();
  }

  showAlbumResults(albums: Album[]): void {
    this.element.setItems(albums.map((a) => this.formatAlbumRow(a)));
    this.show();
  }

  formatAlbumRow(album: Album): string {
    const resultsWidth = (this.element.width as number) - 2;
    const artistWidth = 50;
    const releaseWidth = 10;
    const durationWidth = 5;
    // -3 for column gaps
    const albumWidth = resultsWidth - artistWidth - releaseWidth - durationWidth - 3;

    const albumName = cutoff(album.name, albumWidth).padEnd(albumWidth, ' ');
    const artists = cutoff(
      album.artists.map((a) => a.name).join(', '),
      artistWidth
    ).padEnd(artistWidth, ' ');
    const release = cutoff(album.release_date, releaseWidth).padEnd(releaseWidth, ' ');
    return `${albumName} ${artists} ${release}`;
  }

  showTrackResults(tracks: Track[]): void {
    this.element.setItems(tracks.map((t) => this.formatTrackRow(t)));
    this.show();
  }

  formatTrackRow(track: Track): string {
    // -2 for borders,
    const resultsWidth = (this.element.width as number) - 2;
    const artistWidth = 50;
    const albumWidth = 50;
    const durationWidth = 5;
    // -3 for column gaps
    const songWidth = resultsWidth - artistWidth - albumWidth - durationWidth - 3;

    const song = cutoff(track.name, songWidth).padEnd(songWidth, ' ');
    const artists = cutoff(
      track.artists.map((a) => a.name).join(', '),
      albumWidth
    ).padEnd(artistWidth, ' ');
    const album = cutoff(track.album.name, albumWidth).padEnd(albumWidth, ' ');
    return `${song} ${artists} ${album} ${msToTime(track.duration_ms)}`;
  }

  setResultType(type: SearchType): void {
    this.resultType = type;
  }
}
