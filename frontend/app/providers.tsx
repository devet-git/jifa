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
        const status = (error as any)?.response?.status as number | undefined;
        const backendMsg = (error as any)?.response?.data?.error as
          | string
          | undefined;
        // 5xx responses can leak DB constraint names, stack hints, etc.
        // Log them for devs but show the user a generic message.
        if (status && status >= 500) {
          console.error("[mutation] server error", status, backendMsg, error);
          toast(
            "An internal server error occurred. Please try again later.",
            "error",
          );
          return;
        }
        const msg = backendMsg ?? (error as any)?.message ?? "Something went wrong";
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
