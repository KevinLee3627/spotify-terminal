import type bc from 'blessed-contrib';
import type EventEmitter from 'events';
import { SongBox } from './songBox';
import { AlbumBox } from './albumBox';
import { SearchBox } from './searchBox';
import { PlaybackControlBox } from './playbackControlBox';
import { VolumeControlBox } from './volumeControlBox';
import { QueueBox } from './queueBox';
import { PlaylistBox } from './playlistBox';
import { SearchResultBox } from './searchResultBox';
import { Page } from './page';
import type { AlbumFull, Playback, SimplifiedPlaylist, Track } from './types';
import type { SearchType, Spotify } from './spotify';
import type { Settings } from './main';
import { bold, sleep } from './util';
import { Toast } from './toast';
import { PlaylistModal } from './playlistModal';

interface HomePageOptions {
  gridWidth: number;
  gridHeight: number;
  grid: bc.Widgets.GridElement;
  customEmitter: EventEmitter;
  playback: Playback;
  spotify: Spotify;
  deviceId: string;
  settings: Settings;
}
export class HomePage {
  spotify: Spotify;
  deviceId: string;
  customEmitter: EventEmitter;
  settings: Settings;

  grid: bc.Widgets.GridElement;
  gridWidth: number;
  gridHeight: number;

  page: Page;
  songBox: SongBox;
  playbackControlBox: PlaybackControlBox;
  volumeControlBox: VolumeControlBox;
  albumBox: AlbumBox;
  searchBox: SearchBox;
  searchResultBox: SearchResultBox;
  queueBox: QueueBox;
  playlistBox: PlaylistBox;

  constructor(opts: HomePageOptions) {
    this.gridHeight = opts.gridHeight;
    this.gridWidth = opts.gridWidth;
    this.grid = opts.grid;

    this.deviceId = opts.deviceId;
    this.settings = opts.settings;
    this.spotify = opts.spotify;
    this.customEmitter = opts.customEmitter;

    this.playbackControlBox = new PlaybackControlBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      top: 1,
      left: 1,
      height: 3,
      width: (this.gridWidth - 2) / 3,
      playback: opts.playback,
    });

    this.volumeControlBox = new VolumeControlBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      top: 1,
      left: (this.gridWidth - 2) / 3 + 1,
      height: 3,
      width: (this.gridWidth - 2) / 3,
      playback: opts.playback,
    });

    this.songBox = new SongBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight - 6,
      col: 0,
      width: this.gridWidth,
      height: 6,
      playback: opts.playback,
      controlBox: this.playbackControlBox,
      volumeBox: this.volumeControlBox,
    });

    this.albumBox = new AlbumBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight / 2 - 6,
      col: this.gridWidth / 2 + 1,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2,
      label: 'N/A',
    });

    this.searchBox = new SearchBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: 0,
      width: this.gridWidth / 2,
      height: 3,
    });

    this.searchResultBox = new SearchResultBox({
      grid: opts.grid,
      row: 3,
      col: 0,
      width: this.gridWidth,
      height: this.gridHeight - 9,
      customEmitter: this.customEmitter,
    });

    this.queueBox = new QueueBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      row: 0,
      col: this.gridWidth / 2 + 1,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2 - 6,
      label: 'up next',
    });

    // TODO: Get all playlists, not just first 20
    this.playlistBox = new PlaylistBox({
      grid: opts.grid,
      customEmitter: this.customEmitter,
      row: this.gridHeight / 2 - 6,
      col: 0,
      width: this.gridWidth / 2,
      height: this.gridHeight / 2,
    });

    this.page = new Page({
      name: 'home',
      elements: [
        this.playbackControlBox.element,
        this.volumeControlBox.element,
        this.songBox.element,
        this.albumBox.element,
        this.searchBox.element,
        this.searchResultBox.element,
        this.queueBox.element,
        this.playlistBox.element,
      ],
      autoHide: [this.searchResultBox.element],
      grid: opts.grid,
    });

    this.setupListeners();

    this.initPlaylistsBox().catch((err) => {
      this.songBox.element.screen.log(err);
    });
    this.updateSongAndAlbumBox(opts.playback).catch((err) => {
      this.songBox.element.screen.log(err);
    });
  }

  setupListeners(): void {
    this.customEmitter.on('homePageHotkey', (key: string) => {
      switch (key) {
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
        default:
          break;
      }
    });

    this.customEmitter.on('songEnd', () => {
      // Get new playback state
      const doStuff = async (): Promise<void> => {
        const playback = await this.spotify.getPlaybackState();
        await this.updateSongAndAlbumBox(playback);
      };

      doStuff().catch((err) => {
        this.songBox.element.screen.log(err);
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
        this.songBox.element.screen.log(err);
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
        this.songBox.element.screen.log(err);
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
        this.songBox.element.screen.log(err);
      });
    });

    this.customEmitter.on('hitPlayButton', () => {
      const playButton = async (): Promise<void> => {
        let playback = await this.spotify.getPlaybackState();
        if (playback.item == null) {
          // Transfers playback to an active device if nothing is currently playing
          await this.spotify.transferPlaybackToDevice(this.deviceId);
          await sleep(500);
          await this.spotify.resume(
            { context_uri: 'spotify:playlist:2yjBgi4TAosyAxLRclnKk6' },
            this.deviceId
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
        // TODO: This is duplicated?
        await this.songBox.startProgress(
          playback.progress_ms,
          playback.item?.duration_ms ?? null,
          playback.is_playing
        );
      };
      playButton().catch((err) => {
        this.songBox.element.screen.log(err);
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
        this.songBox.element.screen.log(err);
      });
    });

    // TODO: Fix bug where librespot always unshuffles while starting album/playlist
    this.customEmitter.on('playAlbum', (albumUri: string) => {
      const playAlbum = async (albumUri: string): Promise<void> => {
        await this.spotify.resume({ context_uri: albumUri });
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await sleep(500);
        // TODO: Librespot always sets shuffle to false when changing the context
        // to a playlist or album. Since we keep track of the actual shuffle state within
        // the app, this serves as a hacky workaround to stop this behavior from occuring.
        // We include a settings.json file to restore the shuffle state when restarting
        // librespot.
        const currentShuffleState =
          this.playbackControlBox.currentShuffleState ?? this.settings.onStartShuffleState;
        this.songBox.element.screen.log(`current shuffle: ${String(currentShuffleState)}`);
        await this.spotify.setShuffleState(currentShuffleState);
        this.playbackControlBox.setShuffleState(currentShuffleState);
        this.playbackControlBox.updateShuffleText(currentShuffleState);

        await this.updateSongAndAlbumBox(playback);
      };

      playAlbum(albumUri).catch((err) => {
        this.songBox.element.screen.log(err);
      });
    });

    this.customEmitter.on('playPlaylist', (playlist: SimplifiedPlaylist) => {
      const play = async (playlist: SimplifiedPlaylist): Promise<void> => {
        await this.spotify.resume(
          {
            context_uri: playlist.uri,
            offset: { position: Math.floor(Math.random() * playlist.tracks.total) },
          },
          this.deviceId
        );
        await sleep(500);
        const playback = await this.spotify.getPlaybackState();
        await sleep(500);
        // TODO: Librespot always sets shuffle to false when changing the context
        // to a playlist or album. Since we keep track of the actual shuffle state within
        // the app, this serves as a hacky workaround to stop this behavior from occuring.
        // We include a settings.json file to restore the shuffle state when restarting
        // librespot.
        const currentShuffleState =
          this.playbackControlBox.currentShuffleState ?? this.settings.onStartShuffleState;
        this.songBox.element.screen.log(`current shuffle: ${String(currentShuffleState)}`);
        await this.spotify.setShuffleState(currentShuffleState);
        this.playbackControlBox.setShuffleState(currentShuffleState);
        this.playbackControlBox.updateShuffleText(currentShuffleState);

        await this.updateSongAndAlbumBox(playback);
      };

      play(playlist).catch((err) => {
        this.songBox.element.screen.log(err.response);
      });
    });

    this.customEmitter.on(
      'playTrackFromAlbumWithinAlbum',
      (album: AlbumFull, trackUri: string) => {
        const playNowInAlbum = async (album: AlbumFull, trackUri: string): Promise<void> => {
          // Play the seleced track next, then queue up the rest of the tracks.
          const trackUris = album.tracks.items.map((item) => item.uri);
          const picked = trackUris.slice(trackUris.indexOf(trackUri));
          await this.spotify.resume({ uris: picked });
          await sleep(500);
          const playback = await this.spotify.getPlaybackState();
          await sleep(500);
          // TODO: Librespot always sets shuffle to false when changing the context
          // to a playlist or album. Since we keep track of the actual shuffle state within
          // the app, this serves as a hacky workaround to stop this behavior from occuring.
          // We include a settings.json file to restore the shuffle state when restarting
          // librespot.
          const currentShuffleState =
            this.playbackControlBox.currentShuffleState ?? this.settings.onStartShuffleState;
          this.songBox.element.screen.log(`current shuffle: ${String(currentShuffleState)}`);
          await this.spotify.setShuffleState(currentShuffleState);
          this.playbackControlBox.setShuffleState(currentShuffleState);
          this.playbackControlBox.updateShuffleText(currentShuffleState);

          await this.updateSongAndAlbumBox(playback);
        };

        playNowInAlbum(album, trackUri).catch((err) => {
          this.songBox.element.screen.log(err);
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
        this.songBox.element.screen.log(err);
      });
    });

    this.customEmitter.on('toggleShuffle', (currentState: Playback['shuffle_state']) => {
      const toggleState = async (state: Playback['shuffle_state']): Promise<void> => {
        await this.spotify.setShuffleState(state);
      };

      toggleState(!currentState).catch((err) => {
        this.songBox.element.screen.log(err);
      });
    });

    this.customEmitter.on('setVolume', (volume: number) => {
      if (volume < 0) volume = 0;
      else if (volume > 100) volume = 100;

      const setVolume = async (volume: number): Promise<void> => {
        await this.spotify.setVolume(volume);
      };

      setVolume(volume).catch((err) => {
        this.songBox.element.screen.log(err);
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
        } else if (type === 'artist' && res.artists != null) {
          this.searchResultBox.setResultType('artist');
          this.searchResultBox.setResults(res.artists.items);
          this.searchResultBox.showArtistResults(res.artists.items);
        }
      };

      search(val, type).catch((err) => {
        this.songBox.element.screen.log(err);
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

      if (track == null) return;

      likeTrack(track).catch((err) => {
        this.songBox.element.screen.log(err);
      });
    });

    this.customEmitter.on('showPlaylistModal', (track: Track) => {
      const showPlaylistModal = async (): Promise<void> => {
        const playlistsRes = await this.spotify.getCurrentUserPlaylists();
        const width = 40;
        const height = 35;
        const modal = new PlaylistModal({
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
        this.songBox.element.screen.log(err);
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
          this.createToast(`Added ${bold(track.name)} to playlist ${bold(playlist.name)}`);
        };

        addTrackToPlaylist(playlist, track).catch((err) => {
          this.songBox.element.screen.log(err);
        });
      }
    );

    this.customEmitter.on(
      'deleteTrackFromPlaylist',
      (playlist: SimplifiedPlaylist, track: Track) => {
        const deleteTrackFromPlaylist = async (
          playlist: SimplifiedPlaylist,
          track: Track
        ): Promise<void> => {
          await this.spotify.deleteTracksFromPlaylist(playlist.id, [track.uri]);
          this.createToast(`Removed ${bold(track.name)} from playlist ${bold(playlist.name)}`);
        };

        deleteTrackFromPlaylist(playlist, track).catch((err) => {
          this.songBox.element.screen.log(err);
        });
      }
    );
  }

  async initPlaylistsBox(): Promise<void> {
    const playlists = await this.spotify.getCurrentUserPlaylists();
    this.playlistBox.updateList(playlists.items);
  }

  async updateSongAndAlbumBox(playback: Playback): Promise<void> {
    // TODO: Sometimes doesn't work on initial resume event
    const track = playback.item;
    if (track == null) return;

    const album = await this.spotify.getAlbum(track?.album.id);
    if (album == null) {
      this.albumBox.setNullState();
      return;
    }
    const liked = await this.spotify.checkSavedTracks(
      album.tracks.items.map((track) => track.id)
    );
    const { queue } = await this.spotify.getQueue();

    this.customEmitter.emit('updateSongBox', playback, liked[track.id]);
    this.customEmitter.emit('updateVolumeBox', playback.device.volume_percent ?? 0);
    this.customEmitter.emit('updatePlaybackControlBox', playback);
    this.customEmitter.emit('updateAlbumBox', album, liked, track);
    this.customEmitter.emit('updateQueueBox', queue, liked);

    if (playback.context?.type === 'playlist')
      this.playlistBox.updateList(this.playlistBox.playlists, playback.context.uri);
    else {
      this.playlistBox.updateList(this.playlistBox.playlists);
    }
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
}
