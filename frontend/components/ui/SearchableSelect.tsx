"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { Button } from "@/components/ui/Button";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  avatar?: React.ReactNode;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  className,
  triggerClassName,
  align = "start",
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "input flex items-center justify-between gap-2 cursor-pointer min-w-[160px]",
            "data-[placeholder]:text-muted-2",
            !selected && "text-muted-2",
            triggerClassName,
          )}
        >
          <span className="truncate flex-1 text-left">
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.avatar}
                <span className="truncate">{selected.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("!p-0 w-[var(--radix-popover-trigger-width)] min-w-[200px]", className)} align={align}>
        <Command>
          <CommandInput placeholder={`Search...`} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {opt.avatar}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="truncate text-xs text-muted">{opt.sublabel}</span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
