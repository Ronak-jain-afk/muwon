import { Show } from "solid-js";
import { Mic2 } from "lucide-solid";
import { ui } from "../stores/ui";
import { playerState } from "../stores/player";

export default function LyricsPane() {
  return (
    <Show when={ui.showLyrics}>
      <div class="w-80 border-l border-border bg-surface overflow-y-auto scrollbar-thin p-4">
        <div class="flex items-center gap-2 mb-4">
          <Mic2 class="w-4 h-4 text-primary" />
          <h3 class="text-sm font-medium">Lyrics</h3>
        </div>
        <p class="text-sm text-ink-disabled text-center mt-8">
          {playerState.currentSong
            ? "No lyrics available"
            : "Select a song to view lyrics"}
        </p>
      </div>
    </Show>
  );
}
