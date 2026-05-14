"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShortcutsHelp } from "@/components/layout/ShortcutsHelp";
import { GlobalHotkeys } from "@/components/layout/GlobalHotkeys";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));

  // Apply persisted theme as early as we can in client-rendered code. The
  // <html> class is what Tailwind's dark: variant keys on.
  useEffect(() => {
    const saved = localStorage.getItem("jifa-theme");
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = saved === "dark" || (saved == null && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalHotkeys />
      <ShortcutsHelp />
      {children}
    </QueryClientProvider>
  );
}
