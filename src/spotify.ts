import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import type { AlbumFull, Playback, TokenRes, Device } from './types';

interface ResumePlaybackBody {
  context_uri: string;
  uris: string[];
  offset: {
    position: number;
  };
  position_ms: number;
}

interface RequestOptions<Body = unknown> {
  body?: Body;
  query?: Record<string, unknown>;
}

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

  async getAvailableDevices(): Promise<{ devices: Device[] }> {
    return await this.makeRequest('GET', '/me/player/devices');
  }

  async getPlaybackState(): Promise<Playback> {
    return await this.makeRequest('GET', '/me/player');
  }

  async skipToNext(): Promise<void> {
    await this.makeRequest<unknown>('POST', '/me/player/next');
  }

  async pause(): Promise<void> {
    await this.makeRequest('PUT', '/me/player/pause');
  }

  async transferPlaybackToDevice(deviceId: string): Promise<void> {
    await this.makeRequest('PUT', '/me/player', { body: { device_ids: [deviceId] } });
  }

  async resume(body?: Partial<ResumePlaybackBody>, deviceId?: string): Promise<void> {
    const options: RequestOptions = { query: {}, body };
    if (deviceId != null && options.query != null) options.query.device_id = deviceId;
    await this.makeRequest('PUT', '/me/player/play', options);
  }

  async getAlbum(id: string, limit: number = 100): Promise<AlbumFull> {
    return await this.makeRequest<AlbumFull>('GET', `/albums/${id}?limit=${limit}`);
  }

  async makeRequest<Return = void, Body = Record<string, unknown>>(
    method: 'GET' | 'POST' | 'PUT',
    endpoint: string,
    options?: RequestOptions<Body>
  ): Promise<Return> {
    if (this.token == null) throw new Error('Invalid/missing access token.');
    const res = await axios<Return>({
      method,
      url: `${this.base}${endpoint}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      data: options?.body,
      params: options?.query,
    });
    return res.data;
  }
}
