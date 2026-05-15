"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/HoverCard";

type UserLike = {
  id?: number;
  name?: string;
  email?: string;
  avatar?: string;
};

interface UserHoverCardProps {
  user?: UserLike | null;
  children: React.ReactNode;
  /** Optional override for the side the card opens to (default: top). */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Optional extra info to render under the email row. */
  extra?: React.ReactNode;
}

/* Hover over any user-bound element (avatar, name link, comment author)
   to show a richer card with name, email, and any extra context. Pairs
   well with the existing Avatar component — wrap it as the trigger. */
export function UserHoverCard({
  user,
  children,
  side = "top",
  align = "center",
  extra,
}: UserHoverCardProps) {
  if (!user) return <>{children}</>;
  return (
    <HoverCard openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-72 p-4">
        <div className="flex items-start gap-3">
          <Avatar
            name={user.name}
            src={user.avatar}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.name ?? "Unknown user"}
            </p>
            {user.email && (
              <p className="inline-flex items-center gap-1 text-xs text-muted truncate mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            )}
            {extra && <div className="mt-2">{extra}</div>}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
