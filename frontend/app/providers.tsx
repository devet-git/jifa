"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShortcutsHelp } from "@/components/layout/ShortcutsHelp";
import { GlobalHotkeys } from "@/components/layout/GlobalHotkeys";
import { Toaster } from "@/components/ui/Sonner";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.suppressErrorToast) return;
        const msg = (error as any)?.response?.data?.error
          ?? (error as any)?.message
          ?? "Có lỗi xảy ra";
        toast(msg, "error");
      },
    }),
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
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <GlobalHotkeys />
        <ShortcutsHelp />
        <Toaster />
        <ConfirmDialog />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
