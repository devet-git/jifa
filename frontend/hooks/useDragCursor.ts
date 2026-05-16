import { useEffect } from "react";

// While a dnd-kit drag is in progress, the cursor under the pointer is
// <DragOverlay/>'s content, which has `pointer-events: none` — so the browser
// falls back to the element underneath (often the body), showing the default
// arrow. Force `grabbing` globally for the duration of the drag.
export function useDragCursor(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const style = document.createElement("style");
    style.setAttribute("data-dnd-cursor", "");
    style.textContent =
      "*, *::before, *::after { cursor: grabbing !important; }";
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [active]);
}
