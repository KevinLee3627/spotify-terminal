import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import type { AlbumFull, Playback, TokenRes } from './types';

export class Spotify {
  token: string | null = null;
  base = 'https://api.spotify.com/v1';

  async getToken(): Promise<void> {
    // First check if token exists on disk and is not expired - if one is not true,
    // get from the API.

    try {
      const tokenFile = JSON.parse(await readFile('./token.json', 'utf-8'));
      if (
        tokenFile.access_token == null ||
        tokenFile.expires_in <= new Date().getTime()
      ) {
        const res = await axios<TokenRes>({
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

        const now = new Date().getTime();
        const inOneHour = new Date(now + 3600 * 1000).getTime();
        const tokenFileData = { ...res.data, expires_in: inOneHour };
        await writeFile('./token.json', JSON.stringify(tokenFileData), 'utf-8');
        this.token = res.data.access_token;
      } else {
        this.token = tokenFile.access_token;
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getPlaybackState(): Promise<Playback> {
    return await this.makeRequest('GET', '/me/player');
  }

  async skipToNext(): Promise<void> {
    await this.makeRequest<unknown>('POST', '/me/player/next');
  }

  async getAlbum(id: string, limit: number = 100): Promise<AlbumFull> {
    return await this.makeRequest<AlbumFull>('GET', `/albums/${id}?limit=${limit}`);
  }

  async makeRequest<T>(method: 'GET' | 'POST', endpoint: string): Promise<T> {
    if (this.token == null) throw new Error('Invalid/missing access token.');

    return await axios({
      method,
      url: `${this.base}${endpoint}`,
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }
}
