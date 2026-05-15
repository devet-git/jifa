import { toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Drop-in replacement that delegates to Sonner. Existing callers do
 * `toast("Saved", "success")` — kept identical so we don't have to touch
 * every call site during the UI library migration.
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

/**
 * Dismiss is rarely used by call sites but kept as a no-op so any stale
 * imports compile. Pass no id to dismiss all toasts.
 */
export function dismissToast(id?: string) {
  if (id) sonnerToast.dismiss(id);
  else sonnerToast.dismiss();
}
