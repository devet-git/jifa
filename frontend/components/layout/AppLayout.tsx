"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAppearance } from "@/hooks/useAppearance";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useAppearance();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
