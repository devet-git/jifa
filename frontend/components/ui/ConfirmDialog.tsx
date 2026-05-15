"use client";

import { useConfirmStore } from "@/store/confirm";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

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
    <AlertDialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
