"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("jifa-theme", next ? "dark" : "light");
  }

  return (
    <Tooltip
      content={dark ? "Switch to light mode" : "Switch to dark mode"}
      position="right"
    >
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </Tooltip>
  );
}
