import { Show, createMemo } from "solid-js";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, List, Mic2,
} from "lucide-solid";
import AlbumArt from "./AlbumArt";
import {
  playerState,
  shuffleEnabled,
  repeatMode,
} from "../stores/player";
import { formatTime } from "../lib/format";
import { toggleLyrics, toggleQueue } from "../stores/ui";

interface PlayerBarProps {
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

export default function PlayerBar(props: PlayerBarProps) {
  const hasTrack = createMemo(() => playerState.currentSong !== null);

  function handleVolumeChange(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    props.onVolumeChange(value);
  }

  function handleSeek(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    props.onSeek(value);
  }

  return (
    <div class="flex items-center h-player-bar px-4 bg-surface border-t border-border z-player-bar gap-4">
      <div class="flex items-center gap-3 min-w-0 w-[280px] shrink-0">
        <AlbumArt size={52} />
        <div class="min-w-0">
          <Show
            when={hasTrack()}
            fallback={
              <>
                <p class="text-sm text-ink-disabled">No track playing</p>
                <p class="text-xs text-ink-disabled">Import music to start</p>
              </>
            }
          >
            <p class="text-sm font-medium truncate">{playerState.currentSong?.title}</p>
            <p class="text-xs text-ink-secondary truncate">{playerState.currentSong?.artist}</p>
          </Show>
        </div>
      </div>

      <div class="flex flex-col items-center flex-1 min-w-0 gap-1">
        <div class="flex items-center gap-3">
          <button
            onClick={props.onToggleShuffle}
            class="button-icon !p-1.5 transition-colors"
            classList={{ "!text-primary": shuffleEnabled() }}
            aria-label="Shuffle"
          >
            <Shuffle class="w-4 h-4" />
          </button>
          <button onClick={props.onPrev} disabled={!hasTrack()} class="button-icon" aria-label="Previous">
            <SkipBack class="w-4 h-4" />
          </button>
          <button
            onClick={props.onPlayPause}
            disabled={!hasTrack()}
            class="flex items-center justify-center w-9 h-9 rounded-full bg-ink text-bg hover:bg-ink-secondary transition-colors"
            aria-label={playerState.status === "playing" ? "Pause" : "Play"}
          >
            {playerState.status === "playing" ? (
              <Pause class="w-4 h-4" />
            ) : (
              <Play class="w-4 h-4 ml-0.5" />
            )}
          </button>
          <button onClick={props.onNext} disabled={!hasTrack()} class="button-icon" aria-label="Next">
            <SkipForward class="w-4 h-4" />
          </button>
          <button
            onClick={props.onCycleRepeat}
            class="button-icon !p-1.5 transition-colors"
            classList={{ "!text-primary": repeatMode() !== "off" }}
            aria-label={`Repeat ${repeatMode()}`}
          >
            {repeatMode() === "one" ? <Repeat1 class="w-4 h-4" /> : <Repeat class="w-4 h-4" />}
          </button>
        </div>

        <div class="flex items-center gap-2 w-full max-w-2xl">
          <span class="text-xs text-ink-disabled tabular-nums w-8 text-right">
            {formatTime(playerState.position)}
          </span>
          <input
            type="range"
            min="0"
            max={playerState.duration || 100}
            value={playerState.position}
            onInput={handleSeek}
            disabled={!hasTrack()}
            class="flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink
              [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100
              [&::-webkit-slider-thumb]:transition-opacity
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
              [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:border-0"
          />
          <span class="text-xs text-ink-disabled tabular-nums w-8">
            {formatTime(playerState.duration)}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 w-[280px] shrink-0 justify-end">
        <button onClick={toggleLyrics} class="button-icon" aria-label="Toggle lyrics">
          <Mic2 class="w-4 h-4" />
        </button>
        <button onClick={toggleQueue} class="button-icon" aria-label="Toggle queue">
          <List class="w-4 h-4" />
        </button>
        <div class="flex items-center gap-1.5">
          <button onClick={props.onToggleMute} class="button-icon !p-1.5" aria-label="Toggle mute">
            {playerState.muted ? <VolumeX class="w-4 h-4" /> : <Volume2 class="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={playerState.muted ? 0 : playerState.volume}
            onInput={handleVolumeChange}
            class="w-20 h-1 appearance-none bg-border rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink
              [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:border-0"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
