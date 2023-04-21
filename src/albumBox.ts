import { bold } from './util';
import type { AlbumFull, Track } from './types';
import { TrackBox, type TrackBoxOptions } from './trackBox';

interface AlbumBoxOptions extends TrackBoxOptions {}

export class AlbumBox extends TrackBox {
  currentAlbum: AlbumFull | null = null;

  constructor(opts: AlbumBoxOptions) {
    super(opts);
    this.element.set('id', 'albumBox');

    this.customEmitter.on(
      'updateAlbumBox',
      (album: AlbumFull, liked: Record<string, boolean>, track: Track) => {
        this.setCurrentAlbum(album);
        this.updateLabel(album);
        this.updateList(album.tracks.items, liked);
        this.selectCurrentlyPlaying(track);
      }
    );

    this.element.key(
      ['S-p', 'p', 'up', 'k', 'down', 'j', 'l', 'C-a', 'S-a', 'S-q'],
      (ch, key) => {
        // p -> (p)lay the song now (add to queue and skip current track)
        // Shift-p -> (p)lay the song now, in album context (needs context)

        // TODO: Autoplay songs after album finishes.
        // Manage the index of the selected track manually. Inited in updateAlbumBox
        switch (key.full) {
          case 'up':
          case 'k':
            if (this.currentAlbum != null && this.selectedIndex <= 0) return;
            this.selectedIndex--;
            break;
          case 'down':
          case 'j':
            if (
              this.currentAlbum != null &&
              this.selectedIndex >= this.currentAlbum.total_tracks - 1
            )
              return;
            this.selectedIndex++;
            break;
          case 'p':
            this.customEmitter.emit(
              'playTrack',
              this.currentAlbum?.tracks.items[this.selectedIndex].uri
            );
            break;
          case 'S-p':
            this.customEmitter.emit(
              'playTrackFromAlbumWithinAlbum',
              this.currentAlbum,
              this.currentAlbum?.tracks.items[this.selectedIndex].uri
            );
            break;
          case 'l':
            this.customEmitter.emit(
              'toggleTrackLikeStatus',
              this.currentAlbum?.tracks.items[this.selectedIndex]
            );
            break;
          case 'C-a':
            this.customEmitter.emit(
              'showPlaylistModal',
              this.currentAlbum?.tracks.items[this.selectedIndex]
            );
            break;
          case 'S-a':
            // TODO: If there's >1 artist, maybe have a modal for user to choose which one
            // they want to view?
            this.customEmitter.emit('showArtistPage', this.currentAlbum?.artists[0].id);
            break;
          case 'S-q':
            this.customEmitter.emit(
              'addTrackToQueue',
              this.currentAlbum?.tracks.items[this.selectedIndex]
            );
            break;
          default:
            break;
        }
      }
    );
  }

  updateLabel(album: AlbumFull | null): void {
    if (album == null) {
      this.element.setLabel('No album playing.');
      return;
    }
    this.element.setLabel(`${bold(album.name)} (${album.release_date})`);
  }

  selectCurrentlyPlaying(track: Track): void {
    // Select the currently playing track
    // get index of track in album
    if (this.currentAlbum == null) return;

    const trackIndex = this.currentAlbum?.tracks.items.findIndex((val) => val.id === track.id);
    this.element.select(trackIndex);
    this.selectedIndex = trackIndex;
  }

  setNullState(): void {
    this.element.setLabel('N/A');
  }

  setCurrentAlbum(album: AlbumFull): void {
    this.currentAlbum = album;
  }
}
