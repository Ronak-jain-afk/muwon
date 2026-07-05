import { onMount, onCleanup } from "solid-js";

interface ShortcutHandlers {
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMute: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onFocusSearch: () => void;
}

export default function KeyboardShortcuts(props: ShortcutHandlers) {
  onMount(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          props.onPlayPause();
          break;
        case "ArrowRight":
          if (e.ctrlKey) { e.preventDefault(); props.onNext(); }
          break;
        case "ArrowLeft":
          if (e.ctrlKey) { e.preventDefault(); props.onPrev(); }
          break;
        case "ArrowUp":
          if (e.ctrlKey) { e.preventDefault(); props.onVolumeUp(); }
          break;
        case "ArrowDown":
          if (e.ctrlKey) { e.preventDefault(); props.onVolumeDown(); }
          break;
        case "m":
        case "M":
          props.onToggleMute();
          break;
        case "r":
        case "R":
          props.onCycleRepeat();
          break;
        case "s":
        case "S":
          props.onToggleShuffle();
          break;
        case "/":
          e.preventDefault();
          props.onFocusSearch();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  return null;
}
