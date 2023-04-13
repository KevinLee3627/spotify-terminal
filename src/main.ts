import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { AlbumFull, Playback } from './types';
import { Spotify } from './spotify';
import EventEmitter from 'events';
import { SongBox } from './songBox';
import { AlbumBox } from './albumBox';
import { SearchBox } from './search';

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

export const bold = (str: string): string => `{bold}${str}{/bold}`;

class Screen {
  spotify: Spotify;

  screen = b.screen({ smartCSR: true, autoPadding: true });
  gridHeight = 48;
  gridWidth = 48;

  // CUSTOM EVENTS
  customEmitter: EventEmitter;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  songBox: SongBox;
  albumBox: AlbumBox;
  searchBox: SearchBox;

  // TODO: QUEUEBOX

  // TODO: SEARCH?

  // TODO: Friends activity: https://github.com/valeriangalliat/spotify-buddylist?

  // TODO: PLAYLISTS?

  constructor(spotify: Spotify, playback: Playback) {
    this.spotify = spotify;
    this.customEmitter = new EventEmitter();

    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });

    this.songBox = new SongBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight - 3,
      col: 0,
      width: this.gridWidth,
      height: 3,
      playback,
    });

    this.albumBox = new AlbumBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight / 2 - 3,
      col: 0,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2,
    });

    this.searchBox = new SearchBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: this.gridWidth / 2,
      width: this.gridWidth / 2,
      height: this.gridHeight - 3,
    });

    // this.screen.on('keypress', (ch, key) => {
    //   console.log(key.full);
    // });
  }

  async updateSongAndAlbumBox(playback: Playback): Promise<void> {
    const track = playback.item;
    if (track != null) {
      const album = await this.spotify.getAlbum(track?.album.id);

      if (album == null) {
        this.albumBox.setNullState();
        return;
      }

      this.albumBox.setCurrentAlbum(album);
      this.songBox.updateLabel(track);
      void this.songBox.startProgress(
        playback.progress_ms,
        track?.duration_ms ?? null,
        playback.is_playing
      );
      this.albumBox.updateLabel(album);
      this.albumBox.updateList(album.tracks.items);
      this.albumBox.selectCurrentlyPlaying(track);
    }
  }

  initCustomEmitter(): void {
    this.customEmitter.on('songEnd', () => {
      // Get new playback state
      const doStuff = async (): Promise<void> => {
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      doStuff().catch((err) => {
        console.log(err);
      });
    });

    this.customEmitter.on('skipToNext', () => {
      const skipToNext = async (): Promise<void> => {
        await this.spotify.skipToNext();
        // TODO - how to avoid sleeping? Maybe we 'get' the next song in the queue
        // instead of just waiting?
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      skipToNext().catch((err) => {
        console.log(err);
      });
    });

    this.customEmitter.on('hitPlayButton', () => {
      const playButton = async (): Promise<void> => {
        let playback = await this.spotify.getPlaybackState();
        if (playback.item == null) {
          // Transfers playback to an active device if nothing is currently playing
          await this.spotify.transferPlaybackToDevice(process.env.DEVICE_ID as string);
          await sleep(500);
          await this.spotify.resume(
            { context_uri: 'spotify:playlist:2yjBgi4TAosyAxLRclnKk6' },
            process.env.DEVICE_ID
          );
        } else {
          if (playback.is_playing) {
            await this.spotify.pause();
            this.songBox.stopProgress();
          } else {
            await this.spotify.resume();
          }
        }
        await sleep(500);
        playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
        await this.songBox.startProgress(
          playback.progress_ms,
          playback.item?.duration_ms ?? null,
          playback.is_playing
        );
      };
      playButton().catch((err) => {
        console.log(err);
      });
    });

    this.customEmitter.on('playTrackFromAlbum', (trackUri: string) => {
      const playNow = async (trackUri: string): Promise<void> => {
        // TODO: Can we avoid the sleep() calls?
        await this.spotify.addTrackToQueue(trackUri);
        await sleep(500);
        await this.spotify.skipToNext();
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      playNow(trackUri).catch((err) => {
        console.log(err);
      });
    });

    // TODO: what a name...
    this.customEmitter.on(
      'playTrackFromAlbumWithinAlbum',
      (album: AlbumFull, trackUri: string) => {
        const playNowInAlbum = async (
          album: AlbumFull,
          trackUri: string
        ): Promise<void> => {
          // Play the seleced track next, then queue up the rest of the tracks.
          const trackUris = album.tracks.items.map((item) => item.uri);
          const picked = trackUris.slice(trackUris.indexOf(trackUri));
          await this.spotify.resume({ uris: picked });
          await sleep(500);
          const playback = await this.spotify.getPlaybackState();
          await this.updateSongAndAlbumBox(playback);
        };

        playNowInAlbum(album, trackUri).catch((err) => {
          console.log(err);
        });
      }
    );
  }

  async initGrid(): Promise<void> {
    // Define elements + event listeners
    try {
      this.initCustomEmitter();
      const playback = await this.spotify.getPlaybackState();
      const album = await this.spotify.getAlbum(playback.item?.album.id ?? null);

      if (playback.item == null || album == null) {
        this.songBox.setNullState();
        this.albumBox.setNullState();
        this.songBox.init(playback);
        this.albumBox.init();
        this.searchBox.init();
      } else {
        this.songBox.init(playback);
        this.albumBox.init(album, playback.item);
        this.searchBox.init();
      }

      // Must be arrow function so "this" refers to the class and not the function.
      const screenKeyListener = (ch: any, key: b.Widgets.Events.IKeyEventArg): void => {
        // TODO: Pause playback on application close?
        if (['escape', 'C-c'].includes(key.full)) {
          return process.exit(0);
        }
        switch (key.full) {
          case 's':
            this.songBox.box.focus();
            break;
          case 'a':
            this.albumBox.element.focus();
            break;
          case 'c':
            this.searchBox.element.focus();
            break;
          default:
            break;
        }
      };

      this.screen.key(['escape', 'q', 'C-c', 's', 'a', 'c'], screenKeyListener);

      this.refreshScreen();
    } catch (err) {
      console.log(err);
    }
  }

  refreshScreen(): void {
    this.screen.render();
    setTimeout(() => {
      this.refreshScreen();
    }, 500);
  }
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlaybackState();
  // TODO: Transfer playback to librespot on app startup
  const screen = new Screen(spotify, playback);
  await screen.initGrid();
}
void main();
