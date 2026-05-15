"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Lock, ClipboardList, Zap, LayoutDashboard, Calendar, GitBranch, Search, Rocket, Clock, BookOpen, Filter } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const defaultIcons: Record<string, React.ReactNode> = {
  lock: <Lock className="w-7 h-7 text-muted" />,
  backlog: <ClipboardList className="w-7 h-7 text-muted" />,
  epic: <Zap className="w-7 h-7 text-muted" />,
  board: <LayoutDashboard className="w-7 h-7 text-muted" />,
  calendar: <Calendar className="w-7 h-7 text-muted" />,
  roadmap: <GitBranch className="w-7 h-7 text-muted" />,
  search: <Search className="w-7 h-7 text-muted" />,
  rocket: <Rocket className="w-7 h-7 text-muted" />,
  sprint: <Clock className="w-7 h-7 text-muted" />,
  wiki: <BookOpen className="w-7 h-7 text-muted" />,
  filter: <Filter className="w-7 h-7 text-muted" />,
};

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        compact ? "p-6" : "p-12",
        className,
      )}
    >
      <div className="text-center max-w-sm">
        {icon && (
          <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            {icon}
          </div>
        )}
        <p className="font-semibold text-foreground mb-1">{title}</p>
        {description && (
          <p className="text-sm text-muted leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export { defaultIcons };
