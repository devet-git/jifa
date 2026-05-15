"use client";

import * as React from "react";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

/* Compound form-field wrapper that pairs a label, input, optional
   description, and optional error message in a consistent layout.
   The label is wired to the input via htmlFor / id so screen readers
   announce the field name when focus enters the input. */

interface FormFieldProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  /** Optional explicit ID. Auto-generated via React.useId() if omitted. */
  htmlFor?: string;
  required?: boolean;
  className?: string;
  /** The input element. Cloned to receive the id + aria-describedby. */
  children: React.ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
}

export function FormField({
  label,
  description,
  error,
  htmlFor,
  required,
  className,
  children,
}: FormFieldProps) {
  const autoId = React.useId();
  const fieldId = htmlFor ?? autoId;
  const descId = description ? `${fieldId}-desc` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {React.cloneElement(children, {
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })}
      {description && (
        <p id={descId} className="text-xs text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
