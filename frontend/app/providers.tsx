"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShortcutsHelp } from "@/components/layout/ShortcutsHelp";
import { GlobalHotkeys } from "@/components/layout/GlobalHotkeys";
import { Toaster } from "@/components/ui/Sonner";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";
import { useAppearanceStore } from "@/store/appearance";

// Map font family key to the next/font CSS variable name.
const FONT_VARS: Record<string, string> = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  roboto: "var(--font-roboto)",
  manrope: "var(--font-manrope)",
};

// Map font size key to px value.
const FONT_SIZES: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  xl: "20px",
};

function applyAppearance() {
  const { fontSize, fontFamily, accentColor } = useAppearanceStore.getState();

  document.documentElement.style.setProperty(
    "--font-user-sans",
    FONT_VARS[fontFamily] ?? FONT_VARS.geist,
  );
  document.documentElement.style.setProperty(
    "--font-size",
    FONT_SIZES[fontSize] ?? FONT_SIZES.medium,
  );

  // Remove old accent classes, add the current one.
  const prefix = "accent-";
  for (const cls of document.documentElement.classList) {
    if (cls.startsWith(prefix)) {
      document.documentElement.classList.remove(cls);
    }
  }
  if (accentColor !== "indigo") {
    document.documentElement.classList.add(`accent-${accentColor}`);
  }
}

// Subscriber so any setFontSize / setFontFamily / setAccentColor call
// re-applies immediately without a React re-render cycle.
let subscribed = false;

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

  useEffect(() => {
    const saved = localStorage.getItem("jifa-theme");
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = saved === "dark" || (saved == null && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    applyAppearance();
    if (!subscribed) {
      subscribed = true;
      useAppearanceStore.subscribe(applyAppearance);
    }
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
