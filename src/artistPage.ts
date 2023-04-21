import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { Page } from './page';
import type { Artist } from './types';

interface ArtistPageOptions {
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  artist: Artist;
}
export class ArtistPage {
  customEmitter: EventEmitter;
  artist: Artist;
  page: Page;
  topTracksBox: b.Widgets.ListElement;

  constructor(opts: ArtistPageOptions) {
    this.artist = opts.artist;

    this.topTracksBox = opts.grid.set(
      0,
      opts.gridWidth / 2,
      opts.gridHeight / 2,
      opts.gridWidth / 2,
      b.list,
      {
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
        label: 'top tracks',
      }
    );
    this.topTracksBox.hide();
    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [this.topTracksBox],
    });
    this.customEmitter = opts.customEmitter;

    this.customEmitter.on('artistPageHotkey', (key: string) => {
      switch (key) {
        case 't':
          this.topTracksBox.focus();
          break;
        case ':':
          this.page.hide();
          this.customEmitter.emit('setActivePage', 'main');
          break;
        default:
          break;
      }
    });
  }
}
