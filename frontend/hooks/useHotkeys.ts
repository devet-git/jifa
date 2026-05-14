"use client";

import { useEffect } from "react";

// Hotkey is a single keystroke definition. Modifiers stay false on purpose —
// these are single-letter shortcuts in the spirit of GitHub / Linear / Jira.
// The hook auto-suppresses fires while focus is inside an input, textarea or
// contenteditable element so typing isn't hijacked.
type Hotkey = {
  key: string;
  handler: (e: KeyboardEvent) => void;
  description?: string;
};

export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const match = hotkeys.find(
        (h) => h.key.toLowerCase() === e.key.toLowerCase(),
      );
      if (match) {
        e.preventDefault();
        match.handler(e);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys]);
}
