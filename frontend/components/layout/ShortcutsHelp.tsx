"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/Dialog";

const SHORTCUTS: { key: string; label: string }[] = [
  { key: "?", label: "Show this help" },
  { key: "g d", label: "Go to dashboard" },
  { key: "g m", label: "Go to my issues" },
  { key: "g p", label: "Go to projects" },
  { key: "g s", label: "Go to advanced search" },
  { key: "c", label: "Create issue (on a project page)" },
  { key: "Esc", label: "Close any open dialog" },
];

/* ShortcutsHelp registers the global "?" hotkey to open a Dialog listing
   every keyboard shortcut available in the app. Mounted once at the root
   so any page can summon it. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) {
          return;
        }
      }
      e.preventDefault();
      setOpen((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="md" className="!p-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <span className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </span>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </div>
        <ul className="px-5 py-4 space-y-2.5 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.key} className="flex items-center justify-between">
              <span className="text-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.key.split(" ").map((k, i) => (
                  <span key={i} className="kbd">
                    {k}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-border bg-surface-2/40">
          <p className="text-xs text-muted">
            Press <span className="kbd">?</span> anytime to reopen this dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
