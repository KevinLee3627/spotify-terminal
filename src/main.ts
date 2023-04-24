import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { Image, Playback } from './types';
import { Spotify } from './spotify';
import EventEmitter from 'events';
import { readFileSync } from 'fs';
import type { Page, PageName } from './page';
import { ArtistPage } from './artistPage';
import { HomePage } from './homePage';
import { spawn } from 'child_process';

export interface Settings {
  onStartShuffleState: boolean;
}

class App {
  spotify: Spotify;
  deviceId: string;
  screen = b.screen({
    autoPadding: true,
    log: './log.json',
    fullUnicode: true,
    title: 'Spotify!',
  });

  gridHeight = parseInt(this.screen.height as string, 10);
  gridWidth = parseInt(this.screen.width as string, 10);
  ghostElement = b.box({ height: 0, width: 0 });
  // CUSTOM EVENTS
  customEmitter: EventEmitter;

  // SETTINGS
  settings: Settings;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  homePage: HomePage;

  pages: Record<PageName, Page | null>;
  activePage: PageName;

  constructor(spotify: Spotify, playback: Playback, deviceId: string) {
    this.screen.append(this.ghostElement);
    this.settings = JSON.parse(readFileSync('./settings.json', 'utf8'));

    this.spotify = spotify;
    this.deviceId = deviceId;
    this.customEmitter = new EventEmitter();
    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });

    this.homePage = new HomePage({
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      grid: this.grid,
      customEmitter: this.customEmitter,
      playback,
      spotify,
      deviceId,
      settings: this.settings,
    });

    this.pages = {
      home: this.homePage.page,
      artist: null,
    };
    this.activePage = 'home';

    this.customEmitter.on('showArtistPage', (artistId: string) => {
      const showArtistPage = async (artistId: string): Promise<void> => {
        const artist = await spotify.getArtist(artistId);
        const { tracks: topTracks } = await this.spotify.getArtistTopTracks(artistId);
        const topTracksLiked = await this.spotify.checkSavedTracks(topTracks.map((t) => t.id));
        const albums = await this.spotify.getAllArtistAlbums(artistId, {
          include_groups: ['album'],
        });
        const singles = await this.spotify.getAllArtistAlbums(artistId, {
          include_groups: ['single'],
        });
        const artistPage = new ArtistPage({
          spotify: this.spotify,
          grid: this.grid,
          customEmitter: this.customEmitter,
          gridWidth: this.gridWidth,
          gridHeight: this.gridHeight,
          artist,
          topTracks,
          topTracksLiked,
          albums,
          singles,
        });
        this.pages.artist = artistPage.page;
        this.customEmitter.emit('setActivePage', this.pages.artist.name);
      };

      showArtistPage(artistId).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('setActivePage', (pageName: PageName) => {
      this.activePage = pageName;
      Object.values(this.pages).forEach((page) => {
        if (page == null) return;
        if (page.name === pageName) {
          page.show();
        } else page.hide();
      });
    });

    this.customEmitter.on('showImage', (image: Image) => {
      this.screen.log('showing image');
      const doStuff = async (image: Image): Promise<void> => {
        const child = spawn(`feh`, [
          image.url,
          '--geometry',
          `${String(image.width)}x${String(image.height)}`,
        ]);
        child.stderr.on('data', (data) => {
          this.screen.log(`stderr: ${JSON.stringify(data)}`);
        });
      };
      doStuff(image).catch((err) => {
        this.screen.log(err);
      });
    });
    // TODO: Hotkey system? Ex. 'send current song to playlist GOLD'
    const screenKeyListener = (ch: any, key: b.Widgets.Events.IKeyEventArg): void => {
      // TODO: Pause playback on application close?
      if (['escape', 'C-c'].includes(key.full)) {
        return process.exit(0);
      }

      this.customEmitter.emit(`${this.activePage}PageHotkey`, key.full);
    };
    this.screen.key(
      ['escape', 'q', 'C-c', 's', 'a', 'c', 'v', 'w', 'x', 'y', 'S-a', ':', 't', 'r'],
      screenKeyListener
    );

    this.refreshScreen();
  }

  refreshScreen(): void {
    this.screen.render();
    setTimeout(() => {
      this.refreshScreen();
    }, 500);
  }
}

async function main(): Promise<void> {
  const spotify = new Spotify();
  await spotify.getToken();

  const { devices } = await spotify.getAvailableDevices();
  const device = devices.find((device) => device.name === process.env.DEVICE_NAME);
  if (device == null || device.id == null) {
    throw new Error('Device not found');
  }
  const playback = await spotify.getPlaybackState();
  await spotify.transferPlaybackToDevice(device.id);
  const app = new App(spotify, playback, device.id);
}
main().catch((err) => {
  console.log(err);
  console.log(err.response.data);
});
