import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { Page } from './page';
import { TrackBox } from './trackBox';
import type { Album, Artist, Track } from './types';
import { bold } from './util';

interface ArtistPageOptions {
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  artist: Artist;
  topTracks: Track[];
  topTracksLiked: Record<string, boolean>;
  releases: Album[];
}
export class ArtistPage {
  customEmitter: EventEmitter;
  artist: Artist;
  page: Page;
  topTracksBox: TrackBox;
  nameBox: b.Widgets.BigTextElement;
  releasesBox: b.Widgets.ListElement;
  releaseIndex: number = 0;

  constructor(opts: ArtistPageOptions) {
    this.artist = opts.artist;

    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    this.nameBox = opts.grid.set(0, 0, 4, opts.gridWidth / 2, b.box, {
      tags: true,
      content: `${bold(
        this.artist.name
      )}\nFollowers: ${this.artist.followers.total.toLocaleString(locale)}`,
    });
    this.nameBox.focus();
    this.topTracksBox = new TrackBox({
      row: this.nameBox.height as number,
      col: 0,
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
    this.topTracksBox.element.on('select', (item, i) => {
      this.customEmitter.emit('playTrack', this.topTracksBox.tracks[i].uri);
    });

    const nameBoxHeight = this.nameBox.height as number;
    const topTracksHeight = this.topTracksBox.element.height as number;
    this.releasesBox = opts.grid.set(
      nameBoxHeight + topTracksHeight,
      0,
      opts.gridHeight - nameBoxHeight - topTracksHeight - 6, // 6 = songBoxHeight TODO
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
        label: 'releases',
        keys: true,
      }
    );
    this.releasesBox.setItems(opts.releases.map((r) => `${r.name} - ${r.release_date}`));

    this.releasesBox.key(['up', 'down', 'k', 'j', 'right', 'l', 'enter'], (ch, key) => {
      switch (key.full) {
        case 'up':
        case 'k':
          if (this.releaseIndex <= 0) return;
          this.releaseIndex--;
          break;
        case 'down':
        case 'j':
          if (this.releaseIndex >= opts.releases.length - 1) return;
          this.releaseIndex++;
          break;
        case 'enter':
        case 'right':
        case 'l':
          break;
        default:
          break;
      }
    });

    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [this.topTracksBox.element, this.nameBox, this.releasesBox],
    });

    this.customEmitter = opts.customEmitter;
    this.customEmitter.on('artistPageHotkey', (key: string) => {
      switch (key) {
        case 't':
          this.topTracksBox.element.focus();
          break;
        case 'r':
          this.releasesBox.focus();
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
