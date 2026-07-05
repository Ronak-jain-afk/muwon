export interface Song {
  id: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  trackNumber: number | null;
  thumbnailPath: string;
  lyricsPath: string;
  format: string;
  embeddedCover: boolean;
  available: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isLibrary: boolean;
}

export type PlaybackStatus = "playing" | "paused" | "stopped";
export type RepeatMode = "off" | "one" | "all";

export interface PlayerState {
  currentSongId: string | null;
  currentSong: Song | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  activePlaylistId: string | null;
}

export interface LyricLine {
  time: number;
  text: string;
}

