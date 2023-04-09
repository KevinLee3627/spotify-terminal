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
