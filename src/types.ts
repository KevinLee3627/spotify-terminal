export interface Album {
  album_type: 'album' | 'single' | 'compilation';
  total_tracks: number;
  href: string;
  id: string;
  name: string;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  type: 'album';
  label: string;
  artists: Artist[];
  uri: string;
}

export interface AlbumFull extends Album {
  tracks: {
    href: string;
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
    items: Track[];
  };
}

export interface Track {
  artists: Artist[];
  duration_ms: number;
  name: string;
  disc_number: number;
  track_number: number;
  uri: string;
  id: string;
  explicit: boolean;
  album: Album;
}

interface Artist {
  id: string;
  href: string;
  name: string;
}

export interface Context {
  type: 'album' | 'playlist' | 'album' | 'show';
  href: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export interface Playback {
  device: Device;
  item: Track | null;
  progress_ms: number | null;
  is_playing: boolean;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
  context: Context | null;
}

export interface TokenRes {
  access_token: string;
  token_type: 'Bearer';
  scope: string;
  expires_in: number;
}

export interface Device {
  id: string | undefined;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: 'computer' | 'smartphone' | 'speaker';
  volume_percent: number | undefined;
}

export interface SimplifiedPlaylist {
  collaborative: boolean;
  description: string;
  href: string;
  id: string;
  name: string;
  owner: {
    followers: {
      total: number;
    };
    href: string;
    id: string; // spotify user id
    type: 'user';
    uri: string;
    display_name: string | null;
  };
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    total: number;
  };

  type: 'playlist';
  uri: string;
}

export interface Playlist extends SimplifiedPlaylist {
  followers: {
    total: number;
  };
  tracks: {
    href: string;
    total: number;
    limit: number;
    offset: number;
    next: string | null | undefined;
    previous: string | null | undefined;
    items: PlaylistTrack[];
  };
}

export interface PlaylistTrack {
  added_at: string;
  added_by: {
    followers: {
      total: number;
    };
    href: string;
    id: string; // spotify user id
    type: 'user';
    uri: string;
    display_name: string | null;
  };
  is_local: boolean;
  track: Track;
}
