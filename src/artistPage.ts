import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { Page } from './page';
import { TrackBox } from './trackBox';
import type { Artist, Track } from './types';

interface ArtistPageOptions {
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  artist: Artist;
  topTracks: Track[];
  topTracksLiked: Record<string, boolean>;
}
export class ArtistPage {
  customEmitter: EventEmitter;
  artist: Artist;
  page: Page;
  topTracksBox: TrackBox;

  constructor(opts: ArtistPageOptions) {
    this.artist = opts.artist;

    this.topTracksBox = new TrackBox({
      row: 0,
      col: opts.gridWidth / 2,
      width: opts.gridWidth / 2,
      height: 12,
      grid: opts.grid,
      customEmitter: opts.customEmitter,
      label: 'top tracks',
      tracks: opts.topTracks,
      likedMapping: opts.topTracksLiked,
    });

    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [this.topTracksBox.element],
      autoHide: [],
    });

    this.customEmitter = opts.customEmitter;
    this.customEmitter.on('artistPageHotkey', (key: string) => {
      switch (key) {
        case 't':
          this.topTracksBox.element.focus();
          break;
        case ':':
          this.customEmitter.emit('setActivePage', 'home');
          break;
        default:
          break;
      }
    });
  }
}
