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

function showScreen(playback: Playback): void {
  const screen = b.screen({ smartCSR: true, autoPadding: true });

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
  });

  screen.title = 'TEST!';

  const box = b.box({
    parent: screen,
    width: '100%',
    tags: true,
  });

  const songTitle = playback.item.name;
  const songArtist = playback.item.album.artists.map((artist) => artist.name).join(', ');
  const songInfo = b.text({
    top: '100%-2',
    parent: box,
    content: `PLAYING: {bold}${songTitle}{/bold} by ${songArtist}`,
    tags: true,
  });
  box.append(songInfo);

  const progressBox = b.box({
    parent: box,
    top: '100%-1',
    width: '100%',
  });

  const progressBar = b.progressbar({
    parent: progressBox,
    filled: (playback.progress_ms / playback.item.duration_ms) * 100,
    left: 'center',
    width: '100%-12',
    orientation: 'horizontal',
    pch: '█',
  });
  progressBox.append(progressBar);

  const totalTime = b.text({
    parent: progressBox,
    content: msToTime(playback.item.duration_ms),
    right: 0,
  });
  progressBox.append(totalTime);

  const timeElapsed = b.text({
    parent: progressBox,
    content: msToTime(playback.progress_ms),
    tags: true,
  });
  progressBox.append(timeElapsed);

  box.append(progressBox);

  screen.append(box);

  let progress = playback.progress_ms;
  // TODO: Once the progress tracked here reaches 100%, check the playback status again
  setInterval(() => {
    if (playback.is_playing) {
      progress += 1000;
      const percentage = (progress / playback.item.duration_ms) * 100;
      progressBar.setProgress(percentage);
      timeElapsed.setContent(msToTime(progress));
    }
    screen.render();
  }, 1000);
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

  let progress = playback.progress_ms;
  // TODO: Once the progress tracked here reaches 100%, check the playback status again
  setInterval(() => {
    if (playback.is_playing) {
      progress += 1000;
      updateProgress(progress, playback.item.duration_ms, progressBar, timeElapsed);
    }
    screen.render();
  }, 1000);

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
  });
  screen.render();
}

function updateProgress(
  progress: number,
  duration: number,
  progressBar: b.Widgets.ProgressBarElement,
  timeText: b.Widgets.TextElement
): void {
  progressBar.setProgress((progress / duration) * 100);
  timeText.setContent(msToTime(progress));
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
