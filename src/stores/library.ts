import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import type { Song, Playlist } from "../lib/types";

const [songs, setSongs] = createStore<Record<string, Song>>({});
const [playlists, setPlaylists] = createStore<Playlist[]>([]);
const [activePlaylistId, setActivePlaylistId] = createSignal<string | null>(null);
const [searchQuery, setSearchQuery] = createSignal("");

const filteredSongs = () => {
  const q = searchQuery().toLowerCase().trim();
  const list = Object.values(songs);
  if (!q) return list;
  return list.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
  );
};

export {
  songs, setSongs,
  playlists, setPlaylists,
  activePlaylistId, setActivePlaylistId,
  searchQuery, setSearchQuery,
  filteredSongs,
};
