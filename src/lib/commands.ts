import { invoke } from "@tauri-apps/api/core";
import type { Song, Playlist, PlaybackStatus, RepeatMode } from "./types";

export function importFolder(path: string): Promise<Song[]> {
  return invoke("import_folder", { path });
}

export function getAllSongs(): Promise<Song[]> {
  return invoke("get_all_songs");
}

export function getPlaylists(): Promise<Playlist[]> {
  return invoke("get_playlists");
}

export function createPlaylist(name: string): Promise<Playlist> {
  return invoke("create_playlist", { name });
}

export function deletePlaylist(id: string): Promise<void> {
  return invoke("delete_playlist", { id });
}

export function addToPlaylist(playlistId: string, songIds: string[]): Promise<void> {
  return invoke("add_to_playlist", { playlistId, songIds });
}

export function loadAndPlay(songId: string): Promise<void> {
  return invoke("load_and_play", { songId });
}

export function togglePlay(): Promise<PlaybackStatus> {
  return invoke("toggle_play");
}

export function seek(seconds: number): Promise<void> {
  return invoke("seek", { seconds });
}

export function setVolume(volume: number): Promise<void> {
  return invoke("set_volume", { volume });
}

export function toggleMute(): Promise<boolean> {
  return invoke("toggle_mute");
}

export function nextTrack(): Promise<string | null> {
  return invoke("next_track");
}

export function prevTrack(): Promise<string | null> {
  return invoke("prev_track");
}

export function addToQueue(songIds: string[]): Promise<void> {
  return invoke("add_to_queue", { songIds });
}

export function removeFromQueue(index: number): Promise<void> {
  return invoke("remove_from_queue", { index });
}

export function clearQueue(): Promise<void> {
  return invoke("clear_queue");
}

export function getQueue(): Promise<Song[]> {
  return invoke("get_queue");
}

export function setShuffle(enabled: boolean): Promise<void> {
  return invoke("set_shuffle", { enabled });
}

export function setRepeat(mode: RepeatMode): Promise<void> {
  return invoke("set_repeat", { mode });
}

export interface AppStateResponse {
  currentSongId: string | null;
  playbackStatus: string;
  position: number;
  volume: number;
  muted: boolean;
  shuffleEnabled: boolean;
  repeatMode: string;
  activePlaylistId: string | null;
}

export function getState(): Promise<AppStateResponse> {
  return invoke("get_state");
}


