import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { Playback } from './types';
import { Spotify } from './spotify';

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

const bold = (str: string): string => `{bold}${str}{/bold}`;

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
  albumBox!: b.Widgets.BoxElement;

  constructor(spotify: Spotify, playback: Playback) {
    this.playback = playback;
    this.spotify = spotify;

    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });
  }

  initSongBox(): void {
    this.songBox = this.grid.set(this.gridHeight - 3, 0, 3, this.gridWidth, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });
    this.songBox.key('n', (data) => {
      console.log('N PRESSED');
      const handler = async (): Promise<void> => {
        console.log(`current track: ${this.playback.item.name}`);
        await this.spotify.skipToNext();
        await sleep(500);
        this.playback = await this.spotify.getPlaybackState();
        console.log(`new track: ${this.playback.item.name}`);
        this.updateSongBox();
      };
      handler().catch((err) => {
        console.log(err);
      });
    });

    this.progressBar = b.progressbar({
      filled: (this.playback.progress_ms / this.playback.item.duration_ms) * 100,
      left: 'center',
      width: '100%-12',
      orientation: 'horizontal',
      pch: '█',
    });
    this.songBox.append(this.progressBar);

    this.timeElapsed = b.text({
      content: msToTime(this.playback.progress_ms),
      left: '0',
      tags: true,
    });
    this.songBox.append(this.timeElapsed);

    this.songDuration = b.text({
      content: msToTime(this.playback.item.duration_ms),
      left: '100%-6',
    });
    this.songBox.append(this.songDuration);

    this.updateSongBox();
  }

  initAlbumBox(): void {
    this.albumBox = this.grid.set(0, 0, this.gridHeight - 3, this.gridWidth / 2, b.box, {
      tags: true,
      style: { focus: { border: { fg: 'green' } } },
    });
    this.albumBox.on('click', () => {
      console.log('click');
    });

    this.updateAlbumBox();
  }

  initGrid(): any {
    // Define elements + event listeners
    this.initSongBox();
    this.initAlbumBox();
    void this.refreshScreen();

    // Must be arrow function so "this" refers to the class and not the function.
    const screenKeyListener = (ch: any, key: b.Widgets.Events.IKeyEventArg): void => {
      if (['escape', 'q', 'C-c'].includes(key.full)) return process.exit(0);
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

  showGrid(): void {
    this.initGrid();
  }

  async refreshScreen(): Promise<void> {
    if (this.playback.is_playing) {
      this.playback.progress_ms += 1000;
      if (this.playback.progress_ms >= this.playback.item.duration_ms + 1000) {
        this.playback = await this.spotify.getPlaybackState();
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
    this.progressBar.setProgress(
      (this.playback.progress_ms / this.playback.item.duration_ms) * 100
    );
    this.timeElapsed.setContent(msToTime(this.playback.progress_ms));
    this.songDuration.setContent(msToTime(this.playback.item.duration_ms));
  }

  updateSongBox(): void {
    const songTitle = this.playback.item.name;
    const album = this.playback.item.album;
    const songArtist = album.artists.map((artist) => artist.name).join(', ');
    const albumName = album.name;
    const albumYear = album.release_date.split('-')[0];
    this.songBox.setLabel(
      `${bold(songTitle)} by ${songArtist} | ${albumName} (${albumYear})`
    );
  }

  updateAlbumBox(): void {
    const album = this.playback.item.album;
    this.albumBox.setLabel(`${bold(album.name)} (${album.release_date.split('-')[0]})`);
  }
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlaybackState();
  // showScreen(playback);
  const app = new App(spotify, playback);
  app.showGrid();
}
main().catch((err) => {
  console.log(err);
});
