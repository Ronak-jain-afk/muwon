import { For, Show, onMount } from "solid-js";
import { ListMusic, X } from "lucide-solid";
import { ui } from "../stores/ui";
import type { Song } from "../lib/types";
import { formatTime } from "../lib/format";
import { queue, setQueue, refreshQueue } from "../stores/queue";
import * as cmd from "../lib/commands";

interface QueuePanelProps {
  onPlay: (song: Song) => void;
}

export default function QueuePanel(props: QueuePanelProps) {
  onMount(refreshQueue);

  async function handleRemove(index: number) {
    try {
      await cmd.removeFromQueue(index);
      setQueue(queue().filter((_, i) => i !== index));
    } catch {}
  }

  async function handleClear() {
    try {
      await cmd.clearQueue();
      setQueue([]);
    } catch {}
  }

  return (
    <Show when={ui.showQueue}>
      <div class="w-80 border-l border-border bg-surface flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <div class="flex items-center gap-2">
            <ListMusic class="w-4 h-4 text-primary" />
            <h3 class="text-sm font-medium">Up next</h3>
            <span class="text-xs text-ink-disabled">{queue().length} tracks</span>
          </div>
          <Show when={queue().length > 0}>
            <button onClick={handleClear} class="text-xs text-ink-secondary hover:text-ink transition-colors">
              Clear
            </button>
          </Show>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <Show
            when={queue().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-40 text-ink-disabled gap-2">
                <ListMusic class="w-8 h-8" />
                <p class="text-xs">Queue is empty</p>
                <p class="text-xs">Right-click a song to add it</p>
              </div>
            }
          >
            <For each={queue()}>
              {(song, i) => (
                <div class="group flex items-center gap-3 px-4 py-2 hover:bg-surface-hover/30 transition-colors cursor-pointer"
                     onClick={() => props.onPlay(song)}>
                  <span class="text-xs text-ink-disabled w-4 tabular-nums">{i() + 1}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate">{song.title}</p>
                    <p class="text-xs text-ink-secondary truncate">{song.artist}</p>
                  </div>
                  <span class="text-xs text-ink-disabled tabular-nums">{formatTime(song.duration)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(i()); }}
                    class="opacity-0 group-hover:opacity-100 button-icon !p-1 transition-opacity"
                    aria-label="Remove from queue"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );
}
