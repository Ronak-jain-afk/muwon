import { createSignal, Show } from "solid-js";
import { X, Plus } from "lucide-solid";
import * as cmd from "../lib/commands";
import { setPlaylists } from "../stores/library";

interface PlaylistDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PlaylistDialog(props: PlaylistDialogProps) {
  const [name, setName] = createSignal("");
  const [error, setError] = createSignal("");

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) { setError("Enter a playlist name"); return; }
    try {
      await cmd.createPlaylist(trimmed);
      setPlaylists(await cmd.getPlaylists());
      setName("");
      setError("");
      props.onClose();
    } catch {
      setError("Failed to create playlist");
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) props.onClose();
  }

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-modal-backdrop bg-black/50 flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div class="bg-surface-container border border-border rounded-lg w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-base font-medium">New playlist</h2>
            <button onClick={props.onClose} class="button-icon !p-1" aria-label="Close">
              <X class="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} class="p-5">
            <input
              type="text"
              value={name()}
              onInput={(e) => { setName(e.currentTarget.value); setError(""); }}
              placeholder="Playlist name"
              class="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:outline-none focus:border-ink-secondary transition-colors"
              autofocus
            />
            <Show when={error()}>
              <p class="text-xs text-error mt-2">{error()}</p>
            </Show>
            <div class="flex justify-end gap-2 mt-4">
              <button type="button" onClick={props.onClose} class="button-pill bg-surface-container text-ink-secondary hover:bg-surface-hover">
                Cancel
              </button>
              <button type="submit" class="button-pill bg-ink text-bg hover:bg-ink-secondary">
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
