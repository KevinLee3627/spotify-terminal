import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { AlbumFull, Playback, Track } from './types';
import { Spotify } from './spotify';
import { writeFileSync } from 'fs';
import EventEmitter from 'events';
import { SongBox } from './songBox';

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

class App {
  screen = b.screen({ smartCSR: true, autoPadding: true });
  gridHeight = 48;
  gridWidth = 48;
  playback: Playback;
  spotify: Spotify;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  // SONGBOX
  songBox!: b.Widgets.BoxElement;
  progressBar!: b.Widgets.ProgressBarElement;
  timeElapsed!: b.Widgets.TextElement;
  songDuration!: b.Widgets.TextElement;

  // ALBUMBOX
  albumBox!: b.Widgets.ListElement;
  currentAlbum!: AlbumFull | null;
  selectedAlbumTrackIndex!: number;

  // TODO: QUEUEBOX

  // TODO: SEARCH?

  // TODO: PLAYLISTS?

  constructor(spotify: Spotify, playback: Playback) {
    this.playback = playback;
    this.spotify = spotify;

    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });

    // this.screen.on('keypress', (ch, key) => {
    //   console.log(key.full);
    // });
  }

  initSongBox(): void {
    this.songBox = this.grid.set(this.gridHeight - 3, 0, 3, this.gridWidth, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });

    this.songBox.key(['n', 'p', 'space'], (ch, key) => {
      const skipToNext = async (): Promise<void> => {
        await this.spotify.skipToNext();
        await sleep(500);
        await this.updateBoxes();
      };

      // TODO: ADD DEVICE PICKER BOX
      const playButton = async (): Promise<void> => {
        if (this.playback.item == null) {
          // Transfers playback to an active device if nothing is currently playing
          // TODO: This can NOT be the best way to work this...
          await this.spotify.transferPlaybackToDevice(process.env.DEVICE_ID as string);
          await sleep(250);
          await this.spotify.resume(
            { context_uri: 'spotify:playlist:2yjBgi4TAosyAxLRclnKk6' },
            process.env.DEVICE_ID
          );
          await sleep(500);
          await this.updateBoxes();
        } else {
          if (this.playback.is_playing) {
            await this.spotify.pause();
          } else if (!this.playback.is_playing) {
            await this.spotify.resume();
          }
          await sleep(250);
          await this.fetchCurrentPlayback();
          this.updateSongBox();
        }
      };

      switch (key.full) {
        case 'n':
          skipToNext().catch((err) => {
            writeFileSync('./log.json', JSON.stringify(err));
          });
          break;
        case 'p':
        case 'space':
          playButton().catch((err) => {
            writeFileSync('./log.json', JSON.stringify(err));
          });
          break;
        default:
          break;
      }
    });

    this.progressBar = b.progressbar({
      left: '7',
      width: '100%-14',
      orientation: 'horizontal',
      pch: '█',
    });

    this.songBox.append(this.progressBar);

    this.timeElapsed = b.text({ left: '0' });
    this.songBox.append(this.timeElapsed);

    this.songDuration = b.text({ left: '100%-7' });
    this.songBox.append(this.songDuration);

    this.updateSongBox();
  }

  async initAlbumBox(): Promise<void> {
    await this.fetchCurrentAlbum();
    this.albumBox = this.grid.set(
      24 - 3,
      0,
      this.gridHeight / 2,
      this.gridWidth / 2,
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
      }
    );

    this.albumBox.key(['S-p', 'p', 'up', 'k', 'down', 'j'], (ch, key) => {
      // p -> (p)lay the song now (add to queue and skip current track)
      // Shift-p -> (p)lay the song now, in album context (needs context)
      const playNow = async (trackUri: string): Promise<void> => {
        await this.spotify.addTrackToQueue(trackUri);
        await sleep(500);
        await this.spotify.skipToNext();
        await sleep(500);
        await this.updateBoxes();
      };

      // TODO: This will play the selected track frrom the album, and then the rest of the songs off the album in order.
      // Does it depend on shuffle state? Seems like it?
      // TODO: Autoplay songs after album finishes.
      const playNowInAlbum = async (): Promise<void> => {
        if (this.currentAlbum == null) return;
        // For all the uris of the tracks in the album
        // Separate the uri of the selected track from the rest
        // Play the seleced track next, then queue up the rest of the tracks.
        const selectedTrack =
          this.currentAlbum.tracks.items[this.selectedAlbumTrackIndex];
        const trackUris = this.currentAlbum.tracks.items.map((item) => item.uri);
        const separated = trackUris.reduce<{ selected: string; notSelected: string[] }>(
          (prev, curr) => {
            if (curr === selectedTrack.uri) {
              prev.selected = curr;
            } else {
              prev.notSelected.push(curr);
            }
            return prev;
          },
          { selected: '', notSelected: [] }
        );
        const finalUris = [separated.selected, ...separated.notSelected];
        await this.spotify.resume({ uris: finalUris });
        await sleep(500);
        await this.updateBoxes();
      };
      // Manage the index of the selected track manually. Inited in updateAlbumBox
      if (this.currentAlbum == null) return;

      switch (key.full) {
        case 'up':
        case 'k':
          if (this.selectedAlbumTrackIndex <= 0) return;
          this.selectedAlbumTrackIndex--;
          break;
        case 'down':
        case 'j':
          if (this.selectedAlbumTrackIndex >= this.currentAlbum.total_tracks - 1) return;
          this.selectedAlbumTrackIndex++;
          break;
        case 'p':
          playNow(this.currentAlbum.tracks.items[this.selectedAlbumTrackIndex].uri).catch(
            (err) => {
              writeFileSync('./logs.json', JSON.stringify(err));
            }
          );
          break;
        case 'S-p':
          playNowInAlbum().catch((err) => {
            writeFileSync('./logs.json', JSON.stringify(err));
          });
          break;
        default:
          break;
      }
    });

    // Sets box title/other stuff
    await this.updateAlbumBox();
  }

  async initGrid(): Promise<void> {
    // Define elements + event listeners

    this.initSongBox();
    await this.initAlbumBox();
    void this.refreshScreen();

    // Must be arrow function so "this" refers to the class and not the function.
    const screenKeyListener = (ch: any, key: b.Widgets.Events.IKeyEventArg): void => {
      // TODO: Pause playback on application close?
      if (['escape', 'C-c'].includes(key.full)) {
        return process.exit(0);
      }
      switch (key.full) {
        case 's':
          this.songBox.focus();
          break;
        case 'a':
          this.albumBox.focus();
          break;
        default:
          break;
      }
    };

    this.screen.key(['escape', 'q', 'C-c', 's', 'a'], screenKeyListener);

    this.screen.render();
  }

  async refreshScreen(): Promise<void> {
    if (this.playback.is_playing) {
      if (this.playback.progress_ms == null || this.playback.item == null) {
        return;
      }
      this.playback.progress_ms += 1000;
      if (this.playback.progress_ms >= this.playback.item.duration_ms + 1000) {
        await this.fetchCurrentPlayback();
        await this.updateAlbumBox();
      }
      this.updateProgress();
      this.updateSongBox();
    }
    this.screen.render();
    setTimeout(() => {
      void this.refreshScreen();
    }, 1000);
  }

  updateProgress(): void {
    if (this.playback.item == null || this.playback.progress_ms == null) {
      this.progressBar.setProgress(0);
      this.timeElapsed.setContent('00:00');
      this.songDuration.setContent('00:00');
      return;
    }
    this.progressBar.setProgress(
      (this.playback.progress_ms / this.playback.item.duration_ms) * 100
    );
    this.timeElapsed.setContent(msToTime(this.playback.progress_ms));
    this.songDuration.setContent(msToTime(this.playback.item.duration_ms));
  }

  updateSongBox(): void {
    const track: Track | null = this.playback.item;
    if (track == null) {
      this.songBox.setLabel('N/A');
      return;
    }
    const songTitle = this.playback.item == null ? 'N/A' : this.playback.item.name;
    const songArtist = track.album.artists.map((artist) => artist.name).join(', ');
    const albumName = track.album.name;
    const albumYear = track.album.release_date.split('-')[0];
    this.songBox.setLabel(
      `${bold(songTitle)} by ${songArtist} | ${albumName} (${albumYear})`
    );
  }

  async updateBoxes(): Promise<void> {
    // TODO: This can NOT be the best way to work this...
    // TODO: Reconcile w/ refreshScren
    await this.fetchCurrentPlayback();
    await sleep(500);
    await this.fetchCurrentAlbum();
    await sleep(500);
    this.updateSongBox();
    await this.updateAlbumBox();
  }

  async fetchCurrentPlayback(): Promise<void> {
    this.playback = await this.spotify.getPlaybackState();
  }

  async fetchCurrentAlbum(): Promise<void> {
    if (this.playback.item == null) return;
    this.currentAlbum = await this.spotify.getAlbum(this.playback.item.album.id);
  }

  async updateAlbumBox(): Promise<void> {
    // TODO: Dynamic height based on # of tracks in album?
    if (this.playback.item == null || this.currentAlbum == null) {
      this.albumBox.setLabel('No album playing.');
      return;
    }

    await this.fetchCurrentAlbum();

    const album = this.currentAlbum;
    const listWidth = this.albumBox.width as number;
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
    const rows = this.currentAlbum.tracks.items.map((track) => {
      return formatRow(track);
    });
    this.albumBox.setItems(rows);
    // Select the currently playing track
    this.albumBox.select(this.playback.item.track_number - 1);
    this.selectedAlbumTrackIndex = this.playback.item.track_number - 1;
    this.albumBox.setLabel(`${bold(album.name)} (${album.release_date.split('-')[0]})`);
  }
}
class Screen {
  spotify: Spotify;

  screen = b.screen({ smartCSR: true, autoPadding: true });
  gridHeight = 48;
  gridWidth = 48;

  // CUSTOM EVENTS
  statusEmitter: EventEmitter;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  // SONGBOX
  songBox: SongBox;
  songProgressTimeout!: NodeJS.Timeout;

  // ALBUMBOX
  albumBox!: b.Widgets.ListElement;

  // TODO: QUEUEBOX

  // TODO: SEARCH?

  // TODO: PLAYLISTS?

  constructor(spotify: Spotify, playback: Playback) {
    this.spotify = spotify;
    this.statusEmitter = new EventEmitter();

    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });

    this.songBox = new SongBox({
      grid: this.grid,
      row: this.gridHeight - 3,
      col: 0,
      width: this.gridWidth,
      height: 3,
      playback,
      statusEmitter: this.statusEmitter,
    });

    // this.screen.on('keypress', (ch, key) => {
    //   console.log(key.full);
    // });
  }

  initStatusEmitter(): void {
    this.statusEmitter.on('songEnd', () => {
      // Get new playback state
      const doStuff = async (): Promise<void> => {
        const playback = await this.spotify.getPlaybackState();
        const track = playback.item;
        this.songBox.updateLabel(track);
        void this.songBox.updateProgress(
          playback.progress_ms,
          track?.duration_ms ?? null,
          playback.is_playing
        );
      };

      doStuff().catch((err) => {
        console.log(err);
      });
      console.log('song ENDED!');
    });
  }

  initAlbumBox(): void {
    this.albumBox = this.grid.set(
      24 - 3,
      0,
      this.gridHeight / 2,
      this.gridWidth / 2,
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
      }
    );
  }

  initGrid(playback: Playback): void {
    // Define elements + event listeners
    this.initStatusEmitter();
    this.initAlbumBox();

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
          this.albumBox.focus();
          break;
        default:
          break;
      }
    };

    this.screen.key(['escape', 'q', 'C-c', 's', 'a'], screenKeyListener);

    this.refreshScreen();
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
  // console.log(playback);
  // const app = new App(spotify, playback);
  // try {
  //   await app.initGrid();
  // } catch (error) {
  //   app.screen.destroy();
  //   console.log(error);
  // }
  const screen = new Screen(spotify, playback);
  screen.initGrid(playback);
}
void main();
