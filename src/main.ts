import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { Playback } from './types';
import { Spotify } from './spotify';

function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

class App {
  screen = b.screen({ smartCSR: true, autoPadding: true });
  playback: Playback;
  spotify: Spotify;

  constructor(spotify: Spotify, playback: Playback) {
    this.playback = playback;
    this.spotify = spotify;
  }

  showGrid(): void {
    const screen = b.screen({ smartCSR: true, autoPadding: true });
    const gridHeight = 48;
    const gridWidth = 48;
    const grid = new bc.grid({ rows: gridHeight, cols: gridWidth, screen });

    const songTitle = this.playback.item.name;
    const songArtist = this.playback.item.album.artists
      .map((artist) => artist.name)
      .join(', ');
    const albumName = this.playback.item.album.name;
    const albumYear = this.playback.item.album.release_date.split('-')[0];
    const songBox = grid.set(gridHeight - 3, 0, 3, gridWidth, b.box, {
      label: `{bold}${songTitle}{/bold} by ${songArtist} | ${albumName} (${albumYear})`,
      tags: true,
    });

    const progressBar = b.progressbar({
      filled: (this.playback.progress_ms / this.playback.item.duration_ms) * 100,
      left: 'center',
      width: '100%-12',
      orientation: 'horizontal',
      pch: '█',
    });

    songBox.append(progressBar);

    const timeElapsed = b.text({
      content: msToTime(this.playback.progress_ms),
      left: '0',
      tags: true,
    });
    songBox.append(timeElapsed);

    const totalTime = b.text({
      content: msToTime(this.playback.item.duration_ms),
      left: '100%-6',
    });
    songBox.append(totalTime);

    void this.refreshScreen(screen, progressBar, timeElapsed);

    screen.key(['escape', 'q', 'C-c'], function (ch, key) {
      return process.exit(0);
    });
    screen.render();
  }

  async refreshScreen(
    screen: b.Widgets.Screen,
    progressBar: b.Widgets.ProgressBarElement,
    timeElapsed: b.Widgets.TextElement
  ): Promise<void> {
    if (this.playback.is_playing) {
      this.playback.progress_ms += 1000;
      if (this.playback.progress_ms >= this.playback.item.duration_ms + 1000) {
        this.playback = await this.spotify.getPlaybackState();
      }
      this.updateProgress(
        this.playback.progress_ms,
        this.playback.item.duration_ms,
        progressBar,
        timeElapsed
      );
    }
    setTimeout(() => {
      void this.refreshScreen(screen, progressBar, timeElapsed);
    }, 1000);
    screen.render();
  }

  updateProgress(
    progress: number,
    duration: number,
    progressBar: b.Widgets.ProgressBarElement,
    timeElapsed: b.Widgets.TextElement
  ): void {
    progressBar.setProgress((progress / duration) * 100);
    timeElapsed.setContent(msToTime(progress));
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
