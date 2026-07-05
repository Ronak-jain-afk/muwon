import { Show } from "solid-js";
import { Play, Heart, MoreHorizontal, Music } from "lucide-solid";
import type { Song } from "../lib/types";
import { formatTime } from "../lib/format";

interface SongRowProps {
  song: Song;
  index?: number;
  isActive?: boolean;
  onPlay: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}

export default function SongRow(props: SongRowProps) {
  return (
    <div
      class="group grid grid-cols-[40px_1fr_1fr_auto] gap-2 px-4 py-2 rounded-md text-sm transition-colors duration-100 cursor-pointer"
      classList={{
        "bg-surface-hover/40": props.isActive,
        "hover:bg-surface-hover/30": !props.isActive,
      }}
      onClick={props.onPlay}
      onContextMenu={props.onContextMenu}
    >
      <div class="flex items-center justify-center text-ink-disabled">
        <span class="group-hover:hidden">{props.index != null ? props.index + 1 : ""}</span>
        <Play class="hidden group-hover:block w-3.5 h-3.5 text-ink-secondary" />
      </div>

      <div class="flex items-center gap-3 min-w-0">
        <Show
          when={props.song.thumbnailPath}
          fallback={
            <div class="w-9 h-9 rounded-sm bg-surface-container flex items-center justify-center shrink-0">
              <Music class="w-4 h-4 text-ink-disabled" />
            </div>
          }
        >
          <img
            src={`asset://localhost/covers/${props.song.id}.jpg`}
            alt=""
            class="w-9 h-9 rounded-sm object-cover shrink-0"
            loading="lazy"
          />
        </Show>
        <div class="min-w-0">
          <p class="truncate font-medium text-sm" classList={{ "text-primary": props.isActive }}>
            {props.song.title}
          </p>
          <p class="truncate text-xs text-ink-secondary">{props.song.artist}</p>
        </div>
      </div>

      <div class="hidden md:flex items-center min-w-0">
        <span class="truncate text-ink-secondary text-xs">{props.song.album}</span>
      </div>

      <div class="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); }} class="opacity-0 group-hover:opacity-100 button-icon !p-1.5 transition-all" aria-label="Like">
          <Heart class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); props.onContextMenu?.(e); }}
          class="opacity-0 group-hover:opacity-100 button-icon !p-1.5 transition-all"
          aria-label="More"
        >
          <MoreHorizontal class="w-3.5 h-3.5" />
        </button>
        <span class="text-xs text-ink-disabled tabular-nums w-10 text-right">{formatTime(props.song.duration)}</span>
      </div>
    </div>
  );
}
