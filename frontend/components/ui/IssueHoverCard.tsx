"use client";

import * as React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/HoverCard";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { Issue } from "@/types";

interface IssueHoverCardProps {
  issue?: Pick<
    Issue,
    | "key"
    | "number"
    | "title"
    | "type"
    | "status"
    | "priority"
    | "assignee"
    | "story_points"
  > | null;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/* Hover over any issue-key chip / link / reference to preview the
   issue's title, status, priority, and assignee without leaving the
   current screen. Pair with the issue key in LinksPanel, activity
   feed, search results, notifications, etc. */
export function IssueHoverCard({
  issue,
  children,
  side = "top",
  align = "center",
}: IssueHoverCardProps) {
  if (!issue) return <>{children}</>;
  const keyLabel = issue.key ?? (issue.number != null ? `#${issue.number}` : "");
  return (
    <HoverCard openDelay={300} closeDelay={120}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-80">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0">
              {keyLabel}
            </code>
            <Badge type="issueType" value={issue.type} />
            <Badge type="status" value={issue.status} showDot />
          </div>
          <p className="text-sm font-medium leading-snug line-clamp-3">
            {issue.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted flex-wrap pt-1">
            <Badge type="priority" value={issue.priority} />
            {issue.story_points != null && (
              <span className="bg-surface-2 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-foreground">
                {issue.story_points}pt
              </span>
            )}
            {issue.assignee && (
              <span className="inline-flex items-center gap-1.5 ml-auto">
                <Avatar
                  name={issue.assignee.name}
                  src={issue.assignee.avatar}
                  size="xs"
                />
                <span className="truncate max-w-[140px]">
                  {issue.assignee.name}
                </span>
              </span>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
