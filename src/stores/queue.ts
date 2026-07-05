import { createSignal } from "solid-js";
import type { Song } from "../lib/types";
import * as cmd from "../lib/commands";

const [queue, setQueue] = createSignal<Song[]>([]);

export { queue, setQueue };

export async function refreshQueue() {
  try {
    setQueue(await cmd.getQueue());
  } catch {}
}
