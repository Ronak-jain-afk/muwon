import { Show, For, onMount, onCleanup } from "solid-js";
import { Play, ListPlus, Plus } from "lucide-solid";
import type { Song } from "../lib/types";
import * as cmd from "../lib/commands";
import { playlists } from "../stores/library";

interface ContextMenuProps {
  x: number;
  y: number;
  song: Song | null;
  onClose: () => void;
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
}

export default function ContextMenu(props: ContextMenuProps) {
  function handleClose() { props.onClose(); }

  onMount(() => {
    document.addEventListener("click", handleClose);
    document.addEventListener("contextmenu", handleClose);
    onCleanup(() => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("contextmenu", handleClose);
    });
  });

  async function handleAddToPlaylist(playlistId: string) {
    if (!props.song) return;
    try {
      await cmd.addToPlaylist(playlistId, [props.song.id]);
    } catch {}
    props.onClose();
  }

  return (
    <Show when={props.song}>
      <div
        class="fixed z-tooltip bg-surface-container border border-border rounded-md shadow-xl py-1 min-w-[180px]"
        style={{ left: `${props.x}px`, top: `${props.y}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { props.onPlay(props.song!); props.onClose(); }}
          class="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink hover:bg-surface-hover transition-colors text-left"
        >
          <Play class="w-3.5 h-3.5" />
          Play
        </button>
        <button
          onClick={() => { props.onAddToQueue(props.song!); props.onClose(); }}
          class="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink hover:bg-surface-hover transition-colors text-left"
        >
          <ListPlus class="w-3.5 h-3.5" />
          Add to queue
        </button>

        <div class="h-px bg-border mx-2 my-1" />

        <div class="px-3 py-1.5 text-xs text-ink-disabled uppercase tracking-wider">Add to playlist</div>
        <For each={playlists.filter((p) => !p.isLibrary)}>
          {(pl) => (
            <button
              onClick={() => handleAddToPlaylist(pl.id)}
              class="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink hover:bg-surface-hover transition-colors text-left"
            >
              <Plus class="w-3.5 h-3.5" />
              {pl.name}
            </button>
          )}
        </For>
      </div>
    </Show>
  );
}
