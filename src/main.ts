import * as b from 'blessed';
import bc from 'blessed-contrib';
import type { AlbumFull, Playback, SimplifiedPlaylist, Track } from './types';
import { type SearchType, Spotify } from './spotify';
import EventEmitter from 'events';
import { SongBox } from './songBox';
import { AlbumBox } from './albumBox';
import { SearchBox } from './searchBox';
import { PlaybackControlBox } from './songControlBox';
import { VolumeControlBox } from './volumeControlBox';
import { QueueBox } from './queueBox';
import { PlaylistBox } from './playlistBox';
import { SearchResultBox } from './searchResultBox';
import { Toast } from './toast';
import { PlaylistAddModal } from './playlistAddModal';

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

export function cutoff(
  str: string,
  maxLength: number,
  endingChar = '.',
  endingCharCount = 3
): string {
  if (endingChar.length !== 1) throw new Error('endingChar must be a single character');
  if (maxLength <= 0) throw new Error('maxLength must be greater than 0');
  if (!Number.isInteger(maxLength)) throw new Error('maxLength must be an integer');

  if (str.length <= maxLength) return str;

  return str.slice(0, maxLength - endingCharCount) + endingChar.repeat(endingCharCount);
}

export const bold = (str: string): string => `{bold}${str}{/bold}`;

class Screen {
  spotify: Spotify;
  screen = b.screen({ autoPadding: true, log: './log.json', fullUnicode: true });
  gridHeight = parseInt(this.screen.height as string, 10);
  gridWidth = parseInt(this.screen.width as string, 10);
  ghostElement = b.box({});
  // CUSTOM EVENTS
  customEmitter: EventEmitter;

  // GRID ELEMENTS
  grid: bc.Widgets.GridElement;
  songBox: SongBox;
  playbackControlBox: PlaybackControlBox;
  volumeControlBox: VolumeControlBox;
  albumBox: AlbumBox;
  searchBox: SearchBox;
  searchResultBox: SearchResultBox;
  queueBox: QueueBox;
  playlistBox: PlaylistBox;

  constructor(spotify: Spotify, playback: Playback) {
    this.screen.append(this.ghostElement);

    this.spotify = spotify;
    this.customEmitter = new EventEmitter();
    this.grid = new bc.grid({
      rows: this.gridHeight,
      cols: this.gridWidth,
      screen: this.screen,
    });
    this.playbackControlBox = new PlaybackControlBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      top: 1,
      left: 1,
      height: 3,
      width: ((this.screen.width as number) - 2) / 3,
      playback,
    });

    this.volumeControlBox = new VolumeControlBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      top: 1,
      left: ((this.screen.width as number) - 2) / 3 + 1,
      height: 3,
      width: ((this.screen.width as number) - 2) / 3,
      playback,
    });

    this.songBox = new SongBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight - 6,
      col: 0,
      width: this.gridWidth,
      height: 6,
      playback,
      controlBox: this.playbackControlBox,
      volumeBox: this.volumeControlBox,
    });

    this.albumBox = new AlbumBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight / 2 - 6,
      col: this.gridWidth / 2 + 1,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2,
    });

    this.searchBox = new SearchBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: 0,
      width: this.gridWidth / 2,
      height: 3,
    });

    this.searchResultBox = new SearchResultBox({
      grid: this.grid,
      row: 3,
      col: 0,
      width: this.gridWidth,
      height: this.gridHeight - 9,
      customEmitter: this.customEmitter,
    });

    this.queueBox = new QueueBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: this.gridWidth / 2 + 1,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2 - 6,
    });

    // TODO: Get all playlists, not just first 20
    this.playlistBox = new PlaylistBox({
      grid: this.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight / 2 - 6,
      col: 0,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2,
    });

    // this.screen.on('keypress', (ch, key) => {
    //   this.screen.log(key.full);
    // });
  }

  async updateSongAndAlbumBox(playback: Playback): Promise<void> {
    const track = playback.item;
    if (track != null) {
      const album = await this.spotify.getAlbum(track?.album.id);

      if (album == null) {
        this.albumBox.setNullState();
        return;
      }
      const liked = await this.spotify.checkSavedTracks(
        album.tracks.items.map((track) => track.id)
      );
      const queue = await this.spotify.getQueue();

      this.songBox.setCurrentPlayback(playback);
      this.songBox.updateLabel(track, liked[track.id]);
      void this.songBox.startProgress(
        playback.progress_ms,
        track?.duration_ms ?? null,
        playback.is_playing
      );
      this.playbackControlBox.updateShuffleText(playback.shuffle_state);
      this.playbackControlBox.setShuffleState(playback.shuffle_state);
      this.playbackControlBox.updateRepeatText(playback.repeat_state);
      this.playbackControlBox.setRepeatState(playback.repeat_state);
      this.volumeControlBox.updateVolumeText(playback.device.volume_percent ?? 0);

      this.albumBox.setCurrentAlbum(album);
      this.albumBox.updateLabel(album);
      this.albumBox.updateList(album.tracks.items, liked);
      this.albumBox.selectCurrentlyPlaying(track);

      this.queueBox.updateList(queue.queue);

      if (playback.context?.type === 'playlist')
        this.playlistBox.updateList(this.playlistBox.playlists, playback.context.uri);
      else {
        this.playlistBox.updateList(this.playlistBox.playlists);
      }
    }
  }

  initCustomEmitter(): void {
    this.customEmitter.on('songEnd', () => {
      // Get new playback state
      const doStuff = async (): Promise<void> => {
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      doStuff().catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('skipToNext', () => {
      // TODO: Bug when hitting next after coming back to player after long time.
      const skipToNext = async (): Promise<void> => {
        await this.spotify.skipToNext();
        // TODO - how to avoid sleeping? Maybe we 'get' the next song in the queue
        // instead of just waiting?
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      skipToNext().catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('skipToPrev', () => {
      const skipToNext = async (): Promise<void> => {
        await this.spotify.skipToPrev();
        // TODO - how to avoid sleeping? Maybe we 'get' the next song in the queue
        // instead of just waiting?
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      skipToNext().catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('restartTrack', () => {
      const restartTrack = async (): Promise<void> => {
        await this.spotify.seekToPosition(0);
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      restartTrack().catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('hitPlayButton', () => {
      const playButton = async (): Promise<void> => {
        let playback = await this.spotify.getPlaybackState();
        if (playback.item == null) {
          // Transfers playback to an active device if nothing is currently playing
          await this.spotify.transferPlaybackToDevice(process.env.DEVICE_ID as string);
          await sleep(500);
          await this.spotify.resume(
            { context_uri: 'spotify:playlist:2yjBgi4TAosyAxLRclnKk6' },
            process.env.DEVICE_ID
          );
        } else {
          if (playback.is_playing) {
            await this.spotify.pause();
            this.songBox.stopProgress();
          } else {
            await this.spotify.resume();
          }
        }
        await sleep(500);
        playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
        await this.songBox.startProgress(
          playback.progress_ms,
          playback.item?.duration_ms ?? null,
          playback.is_playing
        );
      };
      playButton().catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('playTrack', (trackUri: string) => {
      const playNow = async (trackUri: string): Promise<void> => {
        // TODO: Can we avoid the sleep() calls?
        await this.spotify.addTrackToQueue(trackUri);
        await sleep(500);
        await this.spotify.skipToNext();
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      playNow(trackUri).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('playAlbum', (albumUri: string) => {
      const playAlbum = async (albumUri: string): Promise<void> => {
        await this.spotify.resume({ context_uri: albumUri });
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      playAlbum(albumUri).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on(
      'playTrackFromAlbumWithinAlbum',
      (album: AlbumFull, trackUri: string) => {
        const playNowInAlbum = async (
          album: AlbumFull,
          trackUri: string
        ): Promise<void> => {
          // Play the seleced track next, then queue up the rest of the tracks.
          const trackUris = album.tracks.items.map((item) => item.uri);
          const picked = trackUris.slice(trackUris.indexOf(trackUri));
          await this.spotify.resume({ uris: picked });
          await sleep(500);
          const playback = await this.spotify.getPlaybackState();
          await this.updateSongAndAlbumBox(playback);
        };

        playNowInAlbum(album, trackUri).catch((err) => {
          this.screen.log(err);
        });
      }
    );

    this.customEmitter.on('cycleRepeatState', (newState: Playback['repeat_state']) => {
      const setState = async (newState: Playback['repeat_state']): Promise<void> => {
        await this.spotify.setRepeatState(newState);
        this.playbackControlBox.setRepeatState(newState);
        this.playbackControlBox.updateRepeatText(newState);
      };

      setState(newState).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('toggleShuffle', (currentState: Playback['shuffle_state']) => {
      const toggleState = async (state: Playback['shuffle_state']): Promise<void> => {
        await this.spotify.setShuffleState(state);
        this.playbackControlBox.updateShuffleText(state);
        this.playbackControlBox.setShuffleState(state);
      };

      toggleState(!currentState).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('setVolume', (volume: number) => {
      if (volume < 0) volume = 0;
      else if (volume > 100) volume = 100;

      const setVolume = async (volume: number): Promise<void> => {
        await this.spotify.setVolume(volume);
        this.volumeControlBox.updateVolumeText(volume);
      };

      setVolume(volume).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('search', (val: string, type: SearchType) => {
      const search = async (val: string, type: SearchType): Promise<void> => {
        const res = await this.spotify.search(val, [type]);
        if (type === 'album' && res.albums != null) {
          this.searchResultBox.setResultType('album');
          this.searchResultBox.setResults(res.albums.items);
          this.searchResultBox.showAlbumResults(res.albums.items);
        } else if (type === 'track' && res.tracks != null) {
          this.searchResultBox.setResultType('track');
          this.searchResultBox.setResults(res.tracks.items);
          this.searchResultBox.showTrackResults(res.tracks.items);
        }
      };

      search(val, type).catch((err) => {
        this.screen.log(err);
      });
    });

    this.customEmitter.on('playPlaylist', (uri: string) => {
      const play = async (uri: string): Promise<void> => {
        await this.spotify.resume({ context_uri: uri }, process.env.DEVICE_ID);
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      play(uri).catch((err) => {
        this.screen.log(err.response);
      });
    });

    this.customEmitter.on('toggleTrackLikeStatus', (track: Track) => {
      const likeTrack = async (track: Track): Promise<void> => {
        const savedRes = await this.spotify.checkSavedTracks([track.id]);
        if (savedRes[track.id]) {
          await this.spotify.removeSavedTracks([track.id]);
          this.createToast(`Removed ${bold(track.name)} from saved tracks`);
        } else {
          await this.spotify.saveTracks([track.id]);
          this.createToast(`Added ${bold(track.name)} to saved tracks`);
        }
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      if (track != null) {
        likeTrack(track).catch((err) => {
          this.screen.log(err);
        });
      }
    });

    this.customEmitter.on('addToPlaylistModal', (track: Track) => {
      const showPlaylistModal = async (): Promise<void> => {
        const playlistsRes = await this.spotify.getCurrentUserPlaylists();
        const width = 40;
        const height = 35;
        const modal = new PlaylistAddModal({
          row: this.gridHeight / 2 - height / 2,
          col: this.gridWidth / 2 - width / 2,
          height,
          width,
          grid: this.grid,
          playlists: playlistsRes.items,
          customEmitter: this.customEmitter,
          track,
        });
        modal.element.focus();
      };

      showPlaylistModal().catch((err) => {
        this.screen.log(err);
      });
    });
    // TODO: Check if track is already in playlist before adding
    this.customEmitter.on(
      'addTrackToPlaylist',
      (playlist: SimplifiedPlaylist, track: Track) => {
        const addTrackToPlaylist = async (
          playlist: SimplifiedPlaylist,
          track: Track
        ): Promise<void> => {
          await this.spotify.addTracksToPlaylist(playlist.id, [track.uri]);
          this.createToast(
            `Added ${bold(track.name)} to playlist ${bold(playlist.name)}`
          );
        };

        addTrackToPlaylist(playlist, track).catch((err) => {
          this.screen.log(err);
        });
      }
    );
  }

  createToast(content: string): Toast {
    const width = 25;
    const height = 8;
    return new Toast({
      row: this.gridHeight - height,
      col: this.gridWidth - width,
      height,
      width,
      content,
      grid: this.grid,
    });
  }

  async initGrid(): Promise<void> {
    // Define elements + event listeners
    try {
      this.initCustomEmitter();
      const playback = await this.spotify.getPlaybackState();
      const album = await this.spotify.getAlbum(playback.item?.album.id ?? null);
      const queue = await this.spotify.getQueue();
      const playlists = await this.spotify.getCurrentUserPlaylists();

      this.playlistBox.updateList(playlists.items);

      if (playback.item == null || album == null) {
        this.songBox.setNullState();
        this.albumBox.setNullState();
        this.albumBox.init();
      } else {
        const liked = await this.spotify.checkSavedTracks(
          album.tracks.items.map((t) => t.id)
        );
        this.albumBox.init(album, playback.item, liked);
        this.queueBox.init(queue.queue);
      }

      // Must be arrow function so "this" refers to the class and not the function.
      const screenKeyListener = (ch: any, key: b.Widgets.Events.IKeyEventArg): void => {
        // TODO: Pause playback on application close?
        if (['escape', 'C-c'].includes(key.full)) {
          return process.exit(0);
        }
        switch (key.full) {
          case 's':
            this.songBox.element.focus();
            break;
          case 'a':
            this.albumBox.element.focus();
            break;
          case 'q':
            this.searchBox.element.focus();
            break;
          case 'c':
            this.playbackControlBox.element.focus();
            break;
          case 'v':
            this.volumeControlBox.element.focus();
            break;
          case 'w':
            this.queueBox.element.focus();
            break;
          case 'y':
            this.playlistBox.element.focus();
            break;
          case ':':
            // After focusing multiple boxes, this command goes funky
            // Could not figure out why the last element on the stack had their
            // focus styling persist - added a "ghost" element that we can focus to
            // in order to 'reset' the focus. Hacky :(
            this.ghostElement.focus();
            break;
          default:
            break;
        }
      };
      this.screen.key(
        ['escape', 'q', 'C-c', 's', 'a', 'c', 'v', 'w', 'x', 'y', ':'],
        screenKeyListener
      );

      this.refreshScreen();
    } catch (err) {
      this.screen.log(err);
    }
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
  const playback = await spotify.getPlaybackState();
  // TODO: Transfer playback to librespot on app startup
  const screen = new Screen(spotify, playback);
  await screen.initGrid();
}
main().catch((err) => {
  console.log(err);
  console.log(err.response.data);
});
