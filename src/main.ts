import * as blessed from 'blessed';
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
  const screen = blessed.screen({ smartCSR: true, autoPadding: true });

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
  });

  screen.title = 'TEST!';

  const box = blessed.box({
    parent: screen,
    width: '100%',
    tags: true,
  });

  const songTitle = playback.item.name;
  const songArtist = playback.item.album.artists.map((artist) => artist.name).join(', ');
  const songInfo = blessed.text({
    top: '100%-2',
    parent: box,
    content: `PLAYING: {bold}${songTitle}{/bold} by ${songArtist}`,
    tags: true,
  });
  box.append(songInfo);

  const progressBox = blessed.box({
    parent: box,
    top: '100%-1',
    width: '100%',
    height: '70',
  });

  const progressBar = blessed.progressbar({
    parent: progressBox,
    filled: (playback.progress_ms / playback.item.duration_ms) * 100,
    left: 'center',
    width: '100%-12',
    height: 1,
    orientation: 'horizontal',
    pch: '█',
  });
  progressBox.append(progressBar);

  const totalTime = blessed.text({
    parent: progressBox,
    content: msToTime(playback.item.duration_ms),
    right: 0,
  });
  progressBox.append(totalTime);

  const timeElapsed = blessed.text({
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

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlaybackState();
  showScreen(playback);
}
main().catch((err) => {
  console.log(err);
});
