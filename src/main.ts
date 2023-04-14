import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { AlbumFull, Playback } from './types';
import { Spotify } from './spotify';
import EventEmitter from 'events';
import { SongBox } from './songBox';
import { AlbumBox } from './albumBox';
import { SearchBox } from './search';
import { PlaybackControlBox } from './songControlBox';
import { VolumeControlBox } from './volumeControlBox';
import { QueueBox } from './queueBox';

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

  screen = b.screen({ smartCSR: true, autoPadding: true, log: './log.json' });
  gridHeight = 48;
  gridWidth = 48;

  // CUSTOM EVENTS
  customEmitter: EventEmitter;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  songBox: SongBox;
  playbackControlBox: PlaybackControlBox;
  volumeControlBox: VolumeControlBox;
  albumBox: AlbumBox;
  searchBox: SearchBox;
  queueBox: QueueBox;

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

    this.playbackControlBox = new PlaybackControlBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight - 3 - 3,
      col: this.gridWidth / 2,
      height: 3,
      width: this.gridWidth / 4,
      playback,
    });

    this.volumeControlBox = new VolumeControlBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight - 3 - 3,
      col: this.gridWidth * 0.75,
      height: 3,
      width: this.gridWidth / 4,
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
      height: 3,
    });

    this.queueBox = new QueueBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: 0,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2 - 3,
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

      const queue = await this.spotify.getQueue();

      this.albumBox.setCurrentAlbum(album);
      this.songBox.updateLabel(track);
      void this.songBox.startProgress(
        playback.progress_ms,
        track?.duration_ms ?? null,
        playback.is_playing
      );
      this.volumeControlBox.updateVolumeText(playback.device.volume_percent ?? 0);
      this.albumBox.updateLabel(album);
      this.albumBox.updateList(album.tracks.items);
      this.albumBox.selectCurrentlyPlaying(track);
      this.queueBox.updateList(queue.queue);
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

    this.customEmitter.on('skipToPrev', () => {
      const skipToNext = async (): Promise<void> => {
        await this.spotify.skipToPrev();
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

    this.customEmitter.on('restartTrack', () => {
      const restartTrack = async (): Promise<void> => {
        await this.spotify.seekToPosition(0);
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      restartTrack().catch((err) => {
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

    this.customEmitter.on('cycleRepeatState', (newState: Playback['repeat_state']) => {
      const setState = async (newState: Playback['repeat_state']): Promise<void> => {
        await this.spotify.setRepeatState(newState);
        this.playbackControlBox.setRepeatState(newState);
        this.playbackControlBox.updateRepeatText(newState);
      };

      setState(newState).catch((err) => {
        console.log(err);
      });
    });

    this.customEmitter.on('toggleShuffle', (currentState: Playback['shuffle_state']) => {
      const toggleState = async (state: Playback['shuffle_state']): Promise<void> => {
        await this.spotify.setShuffleState(state);
        this.playbackControlBox.updateShuffleText(state);
        this.playbackControlBox.setShuffleState(state);
      };

      toggleState(!currentState).catch((err) => {
        console.log(err);
      });
    });

    this.customEmitter.on('setVolume', (volume: number) => {
      if (volume < 0) volume = 0;
      else if (volume > 100) volume = 100;

      const setVolume = async (volume: number): Promise<void> => {
        await this.spotify.setVolume(volume);
        this.volumeControlBox.updateVolumeText(volume);
      };

      setVolume(volume).catch((err) => {
        console.log(err);
      });
    });
  }

  async initGrid(): Promise<void> {
    // Define elements + event listeners
    try {
      this.initCustomEmitter();
      const playback = await this.spotify.getPlaybackState();
      const album = await this.spotify.getAlbum(playback.item?.album.id ?? null);
      const queue = await this.spotify.getQueue();
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
        this.queueBox.init(queue.queue);
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
          case 'q':
            this.searchBox.element.focus();
            break;
          case 'c':
            this.playbackControlBox.element.focus();
            break;
          case 'v':
            this.volumeControlBox.element.focus();
            break;
          case 'w':
            this.queueBox.element.focus();
            break;
          default:
            break;
        }
      };

      this.screen.key(['escape', 'q', 'C-c', 's', 'a', 'c', 'v', 'w'], screenKeyListener);

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
