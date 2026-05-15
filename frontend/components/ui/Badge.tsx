import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type {
  IssueType,
  IssuePriority,
  IssueStatus,
  SprintStatus,
} from "@/types";

const statusColors: Record<IssueStatus, string> = {
  todo: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
  in_progress:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20",
  in_review:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
};

const priorityColors: Record<IssuePriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
  medium:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20",
  urgent:
    "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/20",
};

const typeColors: Record<IssueType, string> = {
  task: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20",
  bug: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/20",
  story:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
  epic: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20",
  subtask:
    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/20",
};

const sprintColors: Record<SprintStatus, string> = {
  planned:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
  active:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20",
  completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
};

const statusLabels: Record<IssueStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statusDots: Record<IssueStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
};

/* Generic variants — use these when the badge isn't representing a
   domain entity (status / priority / type / sprint). */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        default:
          "bg-surface-2 text-foreground ring-1 ring-border",
        secondary:
          "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
        destructive:
          "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/20",
        success:
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
        warning:
          "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
        info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20",
        outline: "ring-1 ring-border text-foreground",
        brand: "bg-brand-soft text-brand ring-1 ring-brand/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type DomainType = "status" | "priority" | "issueType" | "sprint";

interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "type">,
    VariantProps<typeof badgeVariants> {
  /* Domain-aware mode: pass `type` + `value` and the badge picks
     colour/label from the schema. */
  type?: DomainType;
  value?: string;
  showDot?: boolean;
}

export function Badge({
  type,
  value,
  variant,
  showDot,
  className,
  children,
  ...props
}: BadgeProps) {
  /* Generic badge — no `type` means use the `variant` token system. */
  if (!type) {
    return (
      <span
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      >
        {children}
      </span>
    );
  }

  let colorClass = "";
  let label: React.ReactNode = value;

  if (type === "status") {
    colorClass =
      statusColors[value as IssueStatus] ??
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    label = statusLabels[value as IssueStatus] ?? value;
  } else if (type === "priority") {
    colorClass =
      priorityColors[value as IssuePriority] ??
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  } else if (type === "issueType") {
    colorClass =
      typeColors[value as IssueType] ??
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  } else if (type === "sprint") {
    colorClass =
      sprintColors[value as SprintStatus] ??
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize",
        colorClass,
        className,
      )}
      {...props}
    >
      {showDot && type === "status" && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            statusDots[value as IssueStatus] ?? "bg-slate-400",
          )}
        />
      )}
      {label}
      {children}
    </span>
  );
}

export { badgeVariants };
