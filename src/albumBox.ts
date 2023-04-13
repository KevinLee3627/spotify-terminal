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
  customEmitter: EventEmitter;

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

  init(album: AlbumFull, currentTrack: Track | null): void {
    this.element.key(['S-p', 'p', 'up', 'k', 'down', 'j'], (ch, key) => {
      // p -> (p)lay the song now (add to queue and skip current track)
      // Shift-p -> (p)lay the song now, in album context (needs context)
      // const playNow = async (trackUri: string): Promise<void> => {
      //   await this.spotify.addTrackToQueue(trackUri);
      //   await sleep(500);
      //   await this.spotify.skipToNext();
      //   await sleep(500);
      //   await this.updateBoxes();
      // };

      // TODO: This will play the selected track frrom the album, and then the rest of the songs off the album in order.
      // Does it depend on shuffle state? Seems like it?
      // TODO: Autoplay songs after album finishes.
      // const playNowInAlbum = async (album: AlbumFull): Promise<void> => {
      //   // For all the uris of the tracks in the album
      //   // Separate the uri of the selected track from the rest
      //   // Play the seleced track next, then queue up the rest of the tracks.
      //   const selectedTrack = album.tracks.items[this.selectedAlbumTrackIndex];
      //   const trackUris = album.tracks.items.map((item) => item.uri);
      //   const separated = trackUris.reduce<{ selected: string; notSelected: string[] }>(
      //     (prev, curr) => {
      //       if (curr === selectedTrack.uri) {
      //         prev.selected = curr;
      //       } else {
      //         prev.notSelected.push(curr);
      //       }
      //       return prev;
      //     },
      //     { selected: '', notSelected: [] }
      //   );
      //   const finalUris = [separated.selected, ...separated.notSelected];
      //   await this.spotify.resume({ uris: finalUris });
      //   await sleep(500);
      //   await this.updateBoxes();
      // };
      // Manage the index of the selected track manually. Inited in updateAlbumBox

      switch (key.full) {
        case 'up':
        case 'k':
          if (this.selectedAlbumTrackIndex <= 0) return;
          this.selectedAlbumTrackIndex--;
          break;
        case 'down':
        case 'j':
          if (this.selectedAlbumTrackIndex >= album.total_tracks - 1) return;
          this.selectedAlbumTrackIndex++;
          break;
        case 'p':
          this.customEmitter.emit(
            'playTrackFromAlbum',
            album.tracks.items[this.selectedAlbumTrackIndex].uri
          );
          break;
        // case 'S-p':
        //   playNowInAlbum().catch((err) => {
        //     writeFileSync('./logs.json', JSON.stringify(err));
        //   });
        //   break;
        default:
          break;
      }
    });

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

  setNullState(): void {
    this.element.setLabel('N/A');
  }
}
