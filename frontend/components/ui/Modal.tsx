"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/Dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Backwards-compatible wrapper around the Radix-based Dialog primitive.
 * Existing call sites use this with `open`/`onClose`/`title` props.
 */
export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent size={size}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <DialogTitle>{title}</DialogTitle>
            <span className="w-8" aria-hidden />
          </div>
        )}
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
