import { For, Show } from "solid-js";
import { Music } from "lucide-solid";
import type { Song } from "../lib/types";
import SongRow from "./SongRow";
import { filteredSongs } from "../stores/library";
import { playerState } from "../stores/player";

interface SongListProps {
  onPlay: (song: Song) => void;
  onContextMenu?: (e: MouseEvent, song: Song) => void;
}

export default function SongList(props: SongListProps) {
  return (
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <Show
        when={filteredSongs().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-ink-disabled gap-3">
            <Music class="w-12 h-12" />
            <p class="text-sm">No songs found</p>
            <p class="text-xs">Import a folder to get started</p>
          </div>
        }
      >
        <div class="grid grid-cols-[40px_1fr_1fr_auto] gap-2 px-4 py-2 text-xs text-ink-disabled uppercase tracking-wider font-medium border-b border-border sticky top-0 bg-bg/95 backdrop-blur-sm">
          <span class="text-center">#</span>
          <span>Title</span>
          <span class="hidden md:block">Album</span>
          <span class="w-10 text-right">Time</span>
        </div>

        <For each={filteredSongs()}>
          {(song, i) => (
            <SongRow
              song={song}
              index={i()}
              isActive={playerState.currentSong?.id === song.id}
              onPlay={() => props.onPlay(song)}
              onContextMenu={(e) => props.onContextMenu?.(e, song)}
            />
          )}
        </For>

        <div class="h-player-bar" />
      </Show>
    </div>
  );
}
