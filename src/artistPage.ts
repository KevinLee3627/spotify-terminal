import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { Page } from './page';
import { TrackBox } from './trackBox';
import type { Artist, Track } from './types';
import { bold } from './util';

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
  nameBox: b.Widgets.BigTextElement;

  constructor(opts: ArtistPageOptions) {
    this.artist = opts.artist;

    this.topTracksBox = new TrackBox({
      row: 0,
      col: opts.gridWidth / 2 + 1,
      width: opts.gridWidth / 2,
      height: 12,
      grid: opts.grid,
      customEmitter: opts.customEmitter,
      label: 'top tracks',
      tracks: opts.topTracks,
      likedMapping: opts.topTracksLiked,
    });

    this.topTracksBox.element.key(['S-q'], (ch, key) => {
      switch (key.full) {
        case 'S-q':
          this.customEmitter.emit(
            'addTrackToQueue',
            this.topTracksBox.tracks[this.topTracksBox.selectedIndex]
          );
          break;
        default:
          break;
      }
    });

    this.nameBox = opts.grid.set(0, 0, 20, opts.gridWidth / 2, b.box, {
      content: `${bold(this.artist.name)}\nFollowers: ${String(this.artist.followers.total)}`,
    });

    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [this.topTracksBox.element, this.nameBox],
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
