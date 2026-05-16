"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Sun, Moon } from "lucide-react";

// Browsers that support View Transitions (Chrome 111+, Edge, Safari 18+,
// Firefox behind a flag) expose `document.startViewTransition`. Older
// browsers fall back to the snap-flip path.
type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Snap-flip the theme without animation. Suppresses transitions for one
  // frame so the un-animated theme tokens commit cleanly.
  function flipInstant(next: boolean) {
    const css = document.createElement("style");
    css.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none !important;animation:none !important}",
      ),
    );
    document.head.appendChild(css);

    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("jifa-theme", next ? "dark" : "light");

    // Force a reflow so the override is applied before removal.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    window.getComputedStyle(document.body).getPropertyValue("opacity");
    requestAnimationFrame(() => {
      document.head.removeChild(css);
    });
  }

  function toggle() {
    const next = !dark;
    const doc = document as DocumentWithVT;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Fallback for unsupported browsers or users who opted out of motion.
    if (!doc.startViewTransition || reduceMotion) {
      flipInstant(next);
      return;
    }

    // Origin of the circular reveal — the button itself if we have it,
    // otherwise the top-right corner.
    const rect = btnRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const endRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy),
    );

    const transition = doc.startViewTransition(() => {
      flipInstant(next);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${endRadius}px at ${cx}px ${cy}px)`,
      ];
      document.documentElement.animate(
        { clipPath },
        {
          duration: 480,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <Tooltip
      content={dark ? "Switch to light mode" : "Switch to dark mode"}
      position="bottom"
    >
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-3)] transition shrink-0"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </Tooltip>
  );
}
