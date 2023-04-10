import axios from 'axios';
import type { Playback } from './types';

export class Spotify {
  token: string | null = null;
  base = 'https://api.spotify.com/v1';

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

  async getPlaybackState(): Promise<Playback> {
    if (this.token == null) throw new Error('Invalid/missing access token.');

    const res = await axios({
      method: 'GET',
      url: `${this.base}/me/player`,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    return res.data;
  }
}
