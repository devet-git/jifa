import { SquareCheckBig, Bug, Bookmark, Zap, List, ArrowDown, ArrowRight, ArrowUp, TriangleAlert, Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { Issue, IssueType, IssuePriority } from "@/types";

// Minimal, dependency-free version of <IssueCard> for use inside dnd-kit's
// <DragOverlay/>. We can't reuse <IssueCard> there because its Radix
// ContextMenu/Tooltip/HoverCard wrappers install pointer-event handlers that
// fight dnd-kit's overlay tracking, leaving the clone stranded under the
// cursor's start position instead of following it.

const typeIcons: Record<IssueType, { icon: React.ReactNode; tint: string }> = {
  task: { icon: <SquareCheckBig className="w-full h-full" />, tint: "text-blue-500" },
  bug: { icon: <Bug className="w-full h-full" />, tint: "text-red-500" },
  story: { icon: <Bookmark className="w-full h-full" />, tint: "text-emerald-500" },
  epic: { icon: <Zap className="w-full h-full" />, tint: "text-violet-500" },
  subtask: { icon: <List className="w-full h-full" />, tint: "text-cyan-500" },
};

const priorityArrow: Record<IssuePriority, React.ReactNode> = {
  low: <ArrowDown className="w-full h-full" />,
  medium: <ArrowRight className="w-full h-full" />,
  high: <ArrowUp className="w-full h-full" />,
  urgent: <TriangleAlert className="w-full h-full" />,
};

const priorityColor: Record<IssuePriority, string> = {
  low: "text-slate-400",
  medium: "text-sky-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export function IssueDragPreview({ issue }: { issue: Issue }) {
  const type = typeIcons[issue.type] ?? typeIcons.task;
  const isOverdue =
    issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== "done";

  return (
    <div className="bg-surface border border-border rounded-lg p-3 flex items-start gap-3 shadow-lg ring-2 ring-brand/30 select-none pointer-events-none">
      <span className={cn("w-4 h-4 shrink-0 mt-0.5", type.tint)}>{type.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{issue.title}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {issue.key && (
            <span className="font-mono text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded">
              {issue.key}
            </span>
          )}
          {issue.story_points != null && (
            <span className="text-[10px] font-semibold bg-surface-2 text-foreground px-1.5 py-0.5 rounded font-mono">
              {issue.story_points}
            </span>
          )}
          {issue.due_date && (
            <span
              className={cn(
                "text-[10px] font-medium inline-flex items-center gap-0.5",
                isOverdue ? "text-red-500" : "text-muted",
              )}
            >
              <Calendar className="w-2.5 h-2.5" />
              {new Date(issue.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className={cn("w-3.5 h-3.5", priorityColor[issue.priority])}>
          {priorityArrow[issue.priority]}
        </span>
        {issue.assignee && (
          <Avatar name={issue.assignee.name} src={issue.assignee.avatar} size="xs" />
        )}
      </div>
    </div>
  );
}
