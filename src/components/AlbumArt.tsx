import { Show } from "solid-js";
import { Music } from "lucide-solid";
import { playerState } from "../stores/player";

export default function AlbumArt(props: { size?: number; class?: string }) {
  const size = () => props.size ?? 56;

  const song = () => playerState.currentSong;

  return (
    <div
      class={`shrink-0 rounded-sm overflow-hidden bg-surface-container flex items-center justify-center ${props.class ?? ""}`}
      style={{ width: `${size()}px`, height: `${size()}px` }}
    >
      <Show
        when={song()?.thumbnailPath}
        fallback={
          <Music
            class="text-ink-disabled"
            style={{ width: `${size() * 0.45}px`, height: `${size() * 0.45}px` }}
          />
        }
      >
        <img
          src={`asset://localhost/covers/${song()!.id}.jpg`}
          alt={song()?.title ?? "Album art"}
          class="w-full h-full object-cover"
        />
      </Show>
    </div>
  );
}
