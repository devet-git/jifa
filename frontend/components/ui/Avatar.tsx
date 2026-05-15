"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
} as const;

type AvatarSize = keyof typeof sizes;

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* Deterministic gradient per name so the same user is always the same
   colour, even after re-renders or page reloads. */
const gradients = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-fuchsia-500 to-purple-500",
  "from-blue-500 to-indigo-500",
  "from-lime-500 to-emerald-500",
];

function gradientForName(name?: string) {
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

/* Wraps the Radix Avatar primitive so failed image loads fall back to
   the gradient-initials block automatically (Radix handles the swap
   via Image.onLoadingStatusChange). */
export function Avatar({ name, src, size = "md", className, ring }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizes[size],
        ring && "ring-2 ring-white dark:ring-slate-800",
        className,
      )}
      aria-label={name}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name ?? ""}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        delayMs={src ? 200 : 0}
        className={cn(
          "flex h-full w-full items-center justify-center text-white font-semibold bg-gradient-to-br",
          gradientForName(name),
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/* Re-exports for advanced composition (e.g. AvatarGroup overlap). */
export const AvatarRoot = AvatarPrimitive.Root;
export const AvatarImage = AvatarPrimitive.Image;
export const AvatarFallback = AvatarPrimitive.Fallback;
