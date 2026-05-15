"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

/**
 * App-wide toast renderer. Wires Sonner styling to our design tokens via
 * CSS variables on the toaster root. Mount once in providers.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-surface text-foreground border-border rounded-xl",
          description: "text-muted",
          actionButton: "bg-brand text-white",
          cancelButton: "bg-surface-2 text-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--surface)",
          "--success-border": "var(--success)",
          "--success-text": "var(--foreground)",
          "--error-bg": "var(--surface)",
          "--error-border": "var(--danger)",
          "--error-text": "var(--foreground)",
          "--warning-bg": "var(--surface)",
          "--warning-border": "var(--warning)",
          "--warning-text": "var(--foreground)",
          "--info-bg": "var(--surface)",
          "--info-border": "var(--brand)",
          "--info-text": "var(--foreground)",
        } as React.CSSProperties
      }
    />
  );
}

/**
 * Drop-in replacement for the legacy `toast(message, type)` API so existing
 * call sites keep working while we migrate to Sonner-native calls.
 */
export function toast(message: string, type: ToastType = "info") {
  switch (type) {
    case "success":
      sonnerToast.success(message);
      return;
    case "error":
      sonnerToast.error(message);
      return;
    case "warning":
      sonnerToast.warning(message);
      return;
    default:
      sonnerToast(message);
  }
}

export { sonnerToast };
