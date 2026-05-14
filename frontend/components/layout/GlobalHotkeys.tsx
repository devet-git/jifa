"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// GlobalHotkeys handles "g X" two-stroke navigation. After "g" is pressed
// (with no focused input), we wait up to 1.5s for the second key. Single-key
// shortcuts like "?" or "c" are owned by the components that handle them so
// page-specific behaviour stays close to its UI.
export function GlobalHotkeys() {
  const router = useRouter();
  const [awaitingG, setAwaitingG] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function isTyping(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        t.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e)) return;

      if (awaitingG) {
        const dest: Record<string, string> = {
          d: "/dashboard",
          m: "/my-issues",
          p: "/projects",
          s: "/search",
          n: "/notifications",
        };
        const path = dest[e.key.toLowerCase()];
        setAwaitingG(false);
        if (timeout) clearTimeout(timeout);
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        return;
      }
      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        setAwaitingG(true);
        timeout = setTimeout(() => setAwaitingG(false), 1500);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timeout) clearTimeout(timeout);
    };
  }, [awaitingG, router]);

  return null;
}
