interface Album {
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

export interface Playback {
  device: {
    id: string;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    type: 'computer' | 'smartphone' | 'speaker';
    volume_percent: number | null;
  };
  item: {
    album: Album;
    artists: Artist[];
    duration_ms: number;
    id: string;
    name: string;
  };
  progress_ms: number;
  is_playing: boolean;
  shuffle_state: true;
  repeat_state: true;
}

export interface TokenRes {
  access_token: string;
  token_type: 'Bearer';
  scope: string;
  expires_in: number;
}
