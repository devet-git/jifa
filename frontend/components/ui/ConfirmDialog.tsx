"use client";

import { useConfirmStore } from "@/store/confirm";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog() {
  const { open, title, message, confirmLabel, variant, resolve } = useConfirmStore();

  function handleClose() {
    resolve?.(false);
    useConfirmStore.setState({ open: false, resolve: null });
  }

  function handleConfirm() {
    resolve?.(true);
    useConfirmStore.setState({ open: false, resolve: null });
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="sm">
      <p className="text-sm text-muted mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant={variant === "danger" ? "danger" : "gradient"}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
