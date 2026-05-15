"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-2 top-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:bg-surface-2 hover:text-foreground transition disabled:opacity-40",
        ),
        button_next: cn(
          "absolute right-2 top-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:bg-surface-2 hover:text-foreground transition disabled:opacity-40",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted rounded-md w-9 font-medium text-[11px] uppercase tracking-wider",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          "h-9 w-9 p-0 font-normal rounded-md transition cursor-pointer",
          "hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          "aria-selected:opacity-100",
        ),
        range_start: "rounded-r-none",
        range_end: "rounded-l-none",
        selected:
          "[&_button]:bg-brand [&_button]:text-white [&_button]:hover:bg-brand-strong [&_button]:hover:text-white [&_button]:focus:bg-brand",
        today: "[&_button]:ring-1 [&_button]:ring-brand/40 [&_button]:font-semibold",
        outside: "text-muted-2 opacity-50",
        disabled: "text-muted-2 opacity-40 [&_button]:cursor-not-allowed",
        range_middle: "[&_button]:bg-brand-soft [&_button]:text-foreground [&_button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", cls)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", cls)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
