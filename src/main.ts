import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { AlbumFull, Playback, Track } from './types';
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
  albumBox!: b.Widgets.ListElement;
  currentAlbum!: AlbumFull;

  constructor(spotify: Spotify, playback: Playback) {
    this.playback = playback;
    this.spotify = spotify;

    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });

    // this.screen.on('keypress', (ch, key) => {
    //   console.log(ch);
    //   console.log(key);
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
        this.playback = await this.spotify.getPlaybackState();
        this.updateSongBox();
        await this.updateAlbumBox();
      };

      const playButton = async (): Promise<void> => {
        console.log(this.playback);
        if (this.playback.is_playing) {
          console.log('pausing');
          await this.spotify.pause();
        } else {
          console.log('resuming');
          await this.spotify.resume();
        }
        await sleep(250);
        this.playback = await this.spotify.getPlaybackState();
        this.updateSongBox();
      };

      switch (key.full) {
        case 'n':
          skipToNext().catch((err) => {
            console.log(err);
          });
          break;
        case 'p':
        case 'space':
          playButton().catch((err) => {
            console.log(err);
          });
          break;
        default:
          break;
      }
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
    });
    this.songBox.append(this.timeElapsed);

    this.songDuration = b.text({
      content: msToTime(this.playback.item.duration_ms),
      left: '100%-6',
    });
    this.songBox.append(this.songDuration);

    this.updateSongBox();
  }

  async initAlbumBox(): Promise<void> {
    await this.fetchAlbum();

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

  async refreshScreen(): Promise<void> {
    if (this.playback.is_playing) {
      this.playback.progress_ms += 1000;
      if (this.playback.progress_ms >= this.playback.item.duration_ms + 1000) {
        this.playback = await this.spotify.getPlaybackState();
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

  async fetchAlbum(): Promise<void> {
    this.currentAlbum = await this.spotify.getAlbum(this.playback.item.album.id);
  }

  async updateAlbumBox(): Promise<void> {
    await this.fetchAlbum();

    const album = this.playback.item.album;
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
    this.albumBox.setLabel(`${bold(album.name)} (${album.release_date.split('-')[0]})`);
  }
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlaybackState();
  // showScreen(playback);
  const app = new App(spotify, playback);
  await app.initGrid();
}
main().catch((err) => {
  console.log(err);
});
