import { Minus, Square, X } from "lucide-solid";
import { createSignal } from "solid-js";

export default function TitleBar() {
  const [maximized, setMaximized] = createSignal(false);

  async function handleMinimize() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  }

  async function handleMaximize() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
    setMaximized((p) => !p);
  }

  async function handleClose() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }

  return (
    <div class="drag-region flex h-title-bar items-center justify-between bg-surface border-b border-border px-3 z-title-bar">
      <div class="flex items-center gap-2">
        <svg viewBox="0 0 24 24" class="w-4 h-4 text-primary" fill="currentColor">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
        </svg>
        <span class="text-xs font-medium tracking-wide text-ink-secondary">muwon</span>
      </div>
      <div class="no-drag flex items-center">
        <button
          onClick={handleMinimize}
          class="button-icon !rounded-none !p-2.5 hover:bg-surface-hover transition-colors"
          aria-label="Minimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          class="button-icon !rounded-none !p-2.5 hover:bg-surface-hover transition-colors"
          aria-label={maximized() ? "Restore" : "Maximize"}
        >
          <Square class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          class="button-icon !rounded-none !p-2.5 hover:bg-error/20 hover:text-error transition-colors"
          aria-label="Close"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
