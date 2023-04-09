import * as blessed from 'blessed';
import axios from 'axios';
import type { Playback } from './types';

const base = 'https://api.spotify.com/v1';

class Spotify {
  token: string | null = null;

  async getToken(): Promise<void> {
    const res = await axios({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      data: {
        grant_type: 'refresh_token',
        refresh_token: process.env.REFRESH_TOKEN,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    this.token = res.data.access_token;
  }

  async getPlayback(): Promise<Playback | null> {
    if (this.token == null) return null;

    const res = await axios({
      method: 'GET',
      url: `${base}/me/player`,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    return res.data;
  }
}

function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

function showScreen(playback: Playback): void {
  const screen = blessed.screen({ smartCSR: true });

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
  });

  screen.title = 'TEST!';

  const box = blessed.box({
    top: '70%',
    left: 'center',
    width: '100%',
    height: '300',
    // content: `${str}`,
    tags: true,
    border: {
      type: 'line',
    },
  });

  const songTitle = playback.item.name;
  const songArtist = playback.item.album.artists.map((artist) => artist.name).join(', ');
  const str = `PLAYING: {bold}${songTitle}{/bold} by ${songArtist}`;
  const songInfo = blessed.text({
    top: '20',
    content: str,
    tags: true,
  });
  box.append(songInfo);

  const progressBox = blessed.box({
    bottom: '0',
    width: '100%-2',
    height: '150',
  });

  const progressBar = blessed.progressbar({
    filled: (playback.progress_ms / playback.item.duration_ms) * 100,
    left: 'center',
    width: '90%',
    height: 1,
    orientation: 'horizontal',
    pch: '█',
  });
  progressBox.append(progressBar);

  const totalTime = blessed.text({
    content: msToTime(playback.item.duration_ms),
    right: 0,
  });
  progressBox.append(totalTime);

  let progress = playback.progress_ms;
  const timeElapsed = blessed.text({
    content: msToTime(progress),
    tags: true,
  });
  progressBox.append(timeElapsed);

  box.append(progressBox);

  screen.append(box);

  // TODO: Check if this ever goes too out of sync in the future
  setInterval(() => {
    progress += 1000;
    progressBar.setProgress((progress / playback.item.duration_ms) * 100);
    timeElapsed.setContent(msToTime(progress));
    screen.render();
  }, 1000);
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();
  const playback = await spotify.getPlayback();
  if (playback == null) return;
  showScreen(playback);
}
main().catch((err) => {
  console.log(err);
});
