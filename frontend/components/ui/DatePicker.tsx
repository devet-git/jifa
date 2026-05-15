"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
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

function parseValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value + (value.includes("T") ? "" : "T00:00:00"));
  return isNaN(d.getTime()) ? undefined : d;
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  const [open, setOpen] = React.useState(false);

  let dateFormat: string;
  try {
    const ctx = useProjectFormat();
    dateFormat = explicitFormat || ctx.dateFormat || DEFAULT_FORMAT;
  } catch {
    dateFormat = explicitFormat || DEFAULT_FORMAT;
  }

  const selected = parseValue(value);
  const displayText = selected ? fmt(selected, dateFormat) : "";
  const fromDate = parseValue(min);
  const toDate = parseValue(max);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-required={required}
          className={cn(
            "input cursor-pointer flex items-center justify-between gap-2 text-left",
            !selected && "text-muted/60",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <span className="truncate">
            {displayText || placeholder || DEFAULT_FORMAT.toLowerCase()}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toIsoDate(d));
              setOpen(false);
            } else {
              onChange("");
            }
          }}
          defaultMonth={selected}
          startMonth={fromDate}
          endMonth={toDate}
          disabled={
            fromDate || toDate
              ? (d) =>
                  (!!fromDate && d < fromDate) || (!!toDate && d > toDate)
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
