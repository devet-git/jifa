"use client";

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAppearance } from "@/hooks/useAppearance";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useAppearance();
  // Lock <html>/<body> scroll so <main> is the only scroll context.
  // Otherwise long pages add a second scrollbar that drags the sidebar.
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
