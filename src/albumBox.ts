import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { msToTime, bold, cutoff } from './main';
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
  customEmitter: EventEmitter;
  currentAlbum: AlbumFull | null = null;

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

    this.customEmitter = opts.customEmitter;
  }

  init(
    album?: AlbumFull,
    currentTrack?: Track | null,
    liked?: Record<string, boolean>
  ): void {
    this.element.key(['S-p', 'p', 'up', 'k', 'down', 'j', 'l'], (ch, key) => {
      // p -> (p)lay the song now (add to queue and skip current track)
      // Shift-p -> (p)lay the song now, in album context (needs context)

      // TODO: Autoplay songs after album finishes.
      // Manage the index of the selected track manually. Inited in updateAlbumBox
      // TODO: Handle songs with very long names
      // TODO: Add a way to add the selected song to a specific playlist.
      // TODO: Add song to queue
      switch (key.full) {
        case 'up':
        case 'k':
          if (this.currentAlbum != null && this.selectedAlbumTrackIndex <= 0) return;
          this.selectedAlbumTrackIndex--;
          break;
        case 'down':
        case 'j':
          if (
            this.currentAlbum != null &&
            this.selectedAlbumTrackIndex >= this.currentAlbum.total_tracks - 1
          )
            return;
          this.selectedAlbumTrackIndex++;
          break;
        case 'p':
          this.customEmitter.emit(
            'playTrack',
            this.currentAlbum?.tracks.items[this.selectedAlbumTrackIndex].uri
          );
          break;
        case 'S-p':
          this.customEmitter.emit(
            'playTrackFromAlbumWithinAlbum',
            this.currentAlbum,
            this.currentAlbum?.tracks.items[this.selectedAlbumTrackIndex].uri
          );
          break;
        case 'l':
          this.customEmitter.emit(
            'toggleTrackLikeStatus',
            this.currentAlbum?.tracks.items[this.selectedAlbumTrackIndex]
          );
          break;
        default:
          break;
      }
    });
    if (album != null) {
      this.setCurrentAlbum(album);
      this.updateLabel(album);
      this.updateList(album.tracks.items ?? [], liked ?? {});
    }
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

  updateList(tracks: Track[], likedRecord: Record<string, boolean>): void {
    const rows = tracks.map((track, i) => {
      return this.formatRow(track, i, likedRecord[track.id]);
    });
    this.element.setItems(rows);
  }

  formatRow(track: Track, index: number, liked: boolean): string {
    const listWidth = this.element.width as number;
    const totalBorderWidth = 2;
    const totalPaddingWidth = 3; // 4 columns, 1 col of padding between each column
    const trackNumWidth = 2;
    const durationWidth = 5;
    const likedColWidth = 2;

    const trackNameWidth =
      listWidth -
      totalBorderWidth -
      totalPaddingWidth -
      trackNumWidth -
      durationWidth -
      likedColWidth;

    const trackNameCol = cutoff(track.name.padEnd(trackNameWidth, ' '), trackNameWidth);
    const trackNumCol = String(index + 1).padEnd(trackNumWidth, ' ');
    const durationCol = msToTime(track.duration_ms).padEnd(durationWidth, ' ');
    const likedCol = liked ? '♥' : '';

    return `${trackNumCol} ${trackNameCol} ${durationCol} ${likedCol}`;
  }

  selectCurrentlyPlaying(track: Track): void {
    // Select the currently playing track
    // get index of track in album
    if (this.currentAlbum == null) return;

    const trackIndex = this.currentAlbum?.tracks.items.findIndex(
      (val) => val.id === track.id
    );
    this.element.select(trackIndex);
    this.selectedAlbumTrackIndex = trackIndex;
  }

  setNullState(): void {
    this.element.setLabel('N/A');
  }

  setCurrentAlbum(album: AlbumFull): void {
    this.currentAlbum = album;
  }
}
