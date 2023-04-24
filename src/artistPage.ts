import * as b from 'blessed';
import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { AlbumBox } from './albumBox';
import { Page } from './page';
import type { Spotify } from './spotify';
import { TrackBox } from './trackBox';
import type { Album, Artist, Track } from './types';
import { bold, cutoff } from './util';

interface ArtistPageOptions {
  spotify: Spotify;
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  artist: Artist;
  topTracks: Track[];
  topTracksLiked: Record<string, boolean>;
  albums: Album[]; // Includes albums
  singles: Album[]; // Includes singles and EPs
}

type ReleaseMode = 'all' | 'album' | 'single';
export class ArtistPage {
  spotify: Spotify;
  customEmitter: EventEmitter;
  artist: Artist;
  page: Page;
  topTracksBox: TrackBox;
  nameBox: b.Widgets.BigTextElement;
  releasesBox: b.Widgets.ListElement;
  releaseIndex: number = 0;
  releasesBoxMode: ReleaseMode;
  releasesMaxIndex: number;
  allReleases: Album[];
  albums: Album[];
  singles: Album[];
  albumBox: AlbumBox;

  constructor(opts: ArtistPageOptions) {
    this.spotify = opts.spotify;
    this.artist = opts.artist;
    this.customEmitter = opts.customEmitter;

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

    this.allReleases = [...opts.albums, ...opts.singles];
    this.albums = opts.albums;
    this.singles = opts.singles;
    this.releasesMaxIndex = this.allReleases.length - 1;
    this.releasesBoxMode = 'all';
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

    this.releasesBox.setItems(this.allReleases.map((r) => this.formatReleaseRow(r)));

    this.releasesBox.key(
      ['up', 'down', 'k', 'j', 'right', 'l', 'enter', 'a', 's', 'e', 'i'],
      (ch, key) => {
        switch (key.full) {
          case 'up':
          case 'k':
            if (this.releaseIndex <= 0) return;
            this.releaseIndex--;
            break;
          case 'down':
          case 'j':
            if (this.releaseIndex >= this.releasesMaxIndex) return;
            this.releaseIndex++;
            break;
          case 'enter':
          case 'right':
          case 'l':
            this.customEmitter.emit(
              'showAlbumInArtistPage',
              this.albums[this.releaseIndex].id
            );
            this.albumBox.element.focus();
            break;
          case 'a':
            this.setReleaseMode('album');
            break;
          case 's':
            this.setReleaseMode('single');
            break;
          case 'e':
            this.setReleaseMode('all');
            break;
          case 'i':
            if (this.releasesBoxMode === 'all') {
              this.customEmitter.emit(
                'showImage',
                this.allReleases[this.releaseIndex].images[0]
              );
            } else if (this.releasesBoxMode === 'album') {
              this.customEmitter.emit('showImage', this.albums[this.releaseIndex].images[0]);
            } else if (this.releasesBoxMode === 'single') {
              this.customEmitter.emit('showImage', this.singles[this.releaseIndex].images[0]);
            }
            break;
          default:
            break;
        }
      }
    );

    this.albumBox = new AlbumBox({
      row: 0,
      col: opts.gridWidth / 2 + 1,
      width: opts.gridWidth / 2,
      height: opts.gridHeight - 6, // -6 is for songBox
      grid: opts.grid,
      customEmitter: opts.customEmitter,
      label: '',
    });

    this.page = new Page({
      name: 'artist',
      grid: opts.grid,
      elements: [
        this.topTracksBox.element,
        this.nameBox,
        this.releasesBox,
        this.albumBox.element,
      ],
      autoHide: [this.albumBox.element],
    });

    this.customEmitter.on('showAlbumInArtistPage', (albumId: string) => {
      const showAlbum = async (albumId: string): Promise<void> => {
        const album = await this.spotify.getAlbum(albumId);
        const likedMapping = await this.spotify.checkSavedTracks(
          album.tracks.items.map((t) => t.id)
        );
        this.albumBox.updateAlbumBox(album, likedMapping);
        this.albumBox.element.show();
      };
      showAlbum(albumId).catch((err) => {
        this.nameBox.screen.log(err);
      });
    });

    this.customEmitter.on('artistPageHotkey', (key: string) => {
      switch (key) {
        case 't':
          this.topTracksBox.element.focus();
          break;
        case 'r':
          this.releasesBox.focus();
          break;
        case 'q':
          this.albumBox.element.focus();
          break;
        case ':':
          this.customEmitter.emit('setActivePage', 'home');
          break;
        default:
          break;
      }
    });
  }

  formatReleaseRow(album: Album): string {
    const resultsWidth = (this.releasesBox.width as number) - 2; // -2 for border
    const releaseWidth = 10;
    const typeWidth = 6;
    // -3 for column gaps
    const albumWidth = resultsWidth - releaseWidth - typeWidth - 3;

    const albumName = cutoff(album.name, albumWidth).padEnd(albumWidth, ' ');
    const release = cutoff(album.release_date, releaseWidth).padEnd(releaseWidth, ' ');
    return `${albumName} ${release} ${album.album_type}`;
  }

  setReleaseMode(mode: ReleaseMode): void {
    // Resets the index, in case the previous selection was "out of bounds"
    // for the new items.
    // For example, if in 'all' mode, the user selected result 30, but
    // the artist only has 10 albums, trying to display the image for
    // album 30 when there are only 10 would cause an error.
    if (mode === 'album') {
      this.releasesMaxIndex = this.albums.length - 1;
      this.releasesBox.setItems(this.albums.map((r) => this.formatReleaseRow(r)));
    } else if (mode === 'single') {
      this.releasesMaxIndex = this.singles.length - 1;
      this.releasesBox.setItems(this.singles.map((s) => this.formatReleaseRow(s)));
    } else if (mode === 'all') {
      this.releasesMaxIndex = this.allReleases.length - 1;
      this.releasesBox.setItems(this.allReleases.map((r) => this.formatReleaseRow(r)));
    }

    const newIndex =
      this.releaseIndex >= this.releasesMaxIndex ? this.releasesMaxIndex : this.releaseIndex;
    this.releasesBox.select(newIndex);
    this.releaseIndex = newIndex;
    this.releasesBoxMode = mode;
  }
}
