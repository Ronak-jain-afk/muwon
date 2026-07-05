import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import type { Song, PlaybackStatus, RepeatMode } from "../lib/types";

interface PlayerStore {
  currentSong: Song | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
}

const [state, setState] = createStore<PlayerStore>({
  currentSong: null,
  status: "stopped",
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
});

const [shuffleEnabled, setShuffleEnabled] = createSignal(false);
const [repeatMode, setRepeatMode] = createSignal<RepeatMode>("off");

export { state as playerState, setState as setPlayerState };

export { shuffleEnabled, setShuffleEnabled, repeatMode, setRepeatMode };

export function cycleRepeat(): RepeatMode {
  const next = { off: "all" as RepeatMode, all: "one" as RepeatMode, one: "off" as RepeatMode };
  const mode = next[repeatMode()];
  setRepeatMode(mode);
  return mode;
}
