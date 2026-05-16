"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/* Underlying primitives — re-exported for advanced uses. */
const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-surface-3 text-foreground px-2 py-1 text-[11px] font-medium shadow-md",
      "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
      "data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0",
      "data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
      "data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/* Backwards-compatible high-level Tooltip kept for existing call sites
   that pass `content`/`position`/`children`. New code should prefer the
   primitives above for composition. */
interface LegacyTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

function Tooltip({
  content,
  children,
  position = "top",
  delayDuration = 200,
}: LegacyTooltipProps) {
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          side={position}
          collisionPadding={8}
          className="max-w-[300px] whitespace-normal break-words leading-snug"
        >
          {content}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  );
}

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
};
