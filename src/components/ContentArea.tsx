import { Show } from "solid-js";
import { Shuffle, Play } from "lucide-solid";
import type { Song } from "../lib/types";
import SearchBar from "./SearchBar";
import SongList from "./SongList";
import { filteredSongs } from "../stores/library";
import { playlists, activePlaylistId } from "../stores/library";
import { setShuffleEnabled } from "../stores/player";
import { refreshQueue } from "../stores/queue";
import * as cmd from "../lib/commands";

interface ContentAreaProps {
  onPlaySong: (song: Song) => void;
  onContextMenu?: (e: MouseEvent, song: Song) => void;
}

export default function ContentArea(props: ContentAreaProps) {
  const currentPlaylist = () => playlists.find((p) => p.id === activePlaylistId());

  async function handlePlayAll() {
    const songs = filteredSongs();
    if (songs.length === 0) return;
    await cmd.setShuffle(false);
    setShuffleEnabled(false);
    await cmd.clearQueue();
    await cmd.addToQueue(songs.slice(1).map((s) => s.id));
    await refreshQueue();
    props.onPlaySong(songs[0]);
  }

  async function handleShufflePlay() {
    const songs = filteredSongs();
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    await cmd.clearQueue();
    await cmd.addToQueue(shuffled.slice(1).map((s) => s.id));
    await refreshQueue();
    props.onPlaySong(shuffled[0]);
  }

  return (
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-6 pt-4 pb-2">
        <h2 class="text-lg font-bold text-ink truncate">
          {currentPlaylist()?.name ?? "Library"}
        </h2>
        <Show when={filteredSongs().length > 0}>
          <div class="flex items-center gap-2">
            <button onClick={handlePlayAll} class="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium bg-surface-container hover:bg-surface-hover text-ink-secondary hover:text-ink transition-colors">
              <Play class="w-3.5 h-3.5" />
              Play
            </button>
            <button onClick={handleShufflePlay} class="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium bg-surface-container hover:bg-surface-hover text-ink-secondary hover:text-ink transition-colors">
              <Shuffle class="w-3.5 h-3.5" />
              Shuffle
            </button>
          </div>
        </Show>
      </div>
      <div class="px-6 pb-3">
        <SearchBar />
      </div>
      <SongList onPlay={props.onPlaySong} onContextMenu={props.onContextMenu} />
    </div>
  );
}
