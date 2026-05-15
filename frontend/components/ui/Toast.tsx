"use client";

/**
 * Legacy shim — the toast UI is now rendered by Sonner via <Toaster /> in
 * the root providers. Existing `<ToastContainer />` references in the tree
 * can keep importing this without breaking; the actual rendering happens
 * elsewhere. Kept for backwards compat during migration.
 */
export function ToastContainer() {
  return null;
}
