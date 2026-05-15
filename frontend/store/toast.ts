import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const useToastStore = create<{ toasts: Toast[] }>(() => ({
  toasts: [],
}));

export function toast(message: string, type: ToastType = "info") {
  const id = Math.random().toString(36).slice(2, 10);
  useToastStore.setState((s) => ({
    toasts: [...s.toasts, { id, message, type }],
  }));
  setTimeout(() => {
    useToastStore.setState((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  }, 4000);
}

export function dismissToast(id: string) {
  useToastStore.setState((s) => ({
    toasts: s.toasts.filter((t) => t.id !== id),
  }));
}
