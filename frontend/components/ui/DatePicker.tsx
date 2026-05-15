"use client";

import { useRef, useMemo } from "react";
import { useProjectFormat } from "@/lib/projectFormat";
import { fmt } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const DEFAULT_FORMAT = "DD/MM/YYYY";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  dateFormat?: string;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
}

export function DatePicker({
  value,
  onChange,
  dateFormat: explicitFormat,
  placeholder,
  className,
  min,
  max,
  disabled,
  required,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  let dateFormat: string;
  try {
    const ctx = useProjectFormat();
    dateFormat = explicitFormat || ctx.dateFormat || DEFAULT_FORMAT;
  } catch {
    dateFormat = explicitFormat || DEFAULT_FORMAT;
  }

  const displayText = useMemo(() => {
    if (!value) return "";
    const d = new Date(value + (value.includes("T") ? "" : "T00:00:00"));
    if (isNaN(d.getTime())) return value;
    return fmt(d, dateFormat);
  }, [value, dateFormat]);

  function openPicker() {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // fall through to focus+click fallback
      }
    }
    el.focus();
    el.click();
  }

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        type="text"
        readOnly
        value={displayText}
        placeholder={placeholder || DEFAULT_FORMAT.toLowerCase()}
        onClick={openPicker}
        onFocus={openPicker}
        disabled={disabled}
        required={required}
        className={cn(
          "input cursor-pointer",
          !value && "text-muted/60",
          className,
        )}
      />
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
