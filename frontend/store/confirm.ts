import { create } from "zustand";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: "danger" | "primary";
  resolve: ((value: boolean) => void) | null;
}

export const useConfirmStore = create<ConfirmState>(() => ({
  open: false,
  title: "Confirm",
  message: "",
  confirmLabel: "Confirm",
  variant: "primary",
  resolve: null,
}));

export function showConfirm(options: {
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({
      open: true,
      title: options.title ?? "Confirm",
      message: options.message,
      confirmLabel: options.confirmLabel ?? "Confirm",
      variant: options.variant ?? "primary",
      resolve,
    });
  });
}
