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
}

function showGrid(playback: Playback): void {
  const screen = b.screen({ smartCSR: true, autoPadding: true });
  const gridHeight = 48;
  const gridWidth = 48;
  const grid = new bc.grid({ rows: gridHeight, cols: gridWidth, screen });

  const songTitle = playback.item.name;
  const songArtist = playback.item.album.artists.map((artist) => artist.name).join(', ');
  const albumName = playback.item.album.name;
  const albumYear = playback.item.album.release_date.split('-')[0];
  const songBox = grid.set(gridHeight - 3, 0, 3, gridWidth, b.box, {
    label: `{bold}${songTitle}{/bold} by ${songArtist} | ${albumName} (${albumYear})`,
    tags: true,
  });

  const progressBar = b.progressbar({
    filled: (playback.progress_ms / playback.item.duration_ms) * 100,
    left: 'center',
    width: '100%-12',
    orientation: 'horizontal',
    pch: '█',
  });

  songBox.append(progressBar);

  const timeElapsed = b.text({
    content: msToTime(playback.progress_ms),
    left: '0',
    tags: true,
  });
  songBox.append(timeElapsed);

  const totalTime = b.text({
    content: msToTime(playback.item.duration_ms),
    left: '100%-6',
  });
  songBox.append(totalTime);

  void refreshScreen(
    screen,
    playback,
    playback.progress_ms,
    playback.item.duration_ms,
    progressBar,
    timeElapsed
  );
  // TODO: Once the progress tracked here reaches 100%, check the playback status again
  setTimeout(() => {}, 1000);

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
  });
  screen.render();
}

async function refreshScreen(
  screen: b.Widgets.Screen,
  playback: Playback,
  progress: number,
  duration: number,
  progressBar: b.Widgets.ProgressBarElement,
  timeElapsed: b.Widgets.TextElement
): Promise<void> {
  if (playback.is_playing) {
    progress += 1000;
    if (progress >= duration + 1000) {
      const spotify = new Spotify();
      await spotify.getToken();
      playback = await spotify.getPlaybackState();
      progress = playback.progress_ms;
      duration = playback.item.duration_ms;
    }
    updateProgress(progress, duration, progressBar, timeElapsed);
  }
  setTimeout(() => {
    void refreshScreen(screen, playback, progress, duration, progressBar, timeElapsed);
  }, 1000);
  screen.render();
}

function updateProgress(
  progress: number,
  duration: number,
  progressBar: b.Widgets.ProgressBarElement,
  timeElapsed: b.Widgets.TextElement
): void {
  progressBar.setProgress((progress / duration) * 100);
  timeElapsed.setContent(msToTime(progress));
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlaybackState();
  // showScreen(playback);
  showGrid(playback);
}
main().catch((err) => {
  console.log(err);
});
