import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermissionsStore } from "@/store/permissions";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";
import { Copy, ExternalLink, Hash, Type as TypeIcon, SquareCheckBig, Bug, Bookmark, Zap, List, ArrowDown, ArrowRight, ArrowUp, TriangleAlert, Calendar, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue, IssueType, IssuePriority } from "@/types";

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

interface Props {
  draggable?: boolean;
  issue: Issue;
  onClick?: () => void;
  className?: string;
  dragging?: boolean;
}

export function IssueCard({ issue, onClick, className, dragging, draggable }: Props) {
  const type = typeIcons[issue.type] ?? typeIcons.task;
  const isOverdue = issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== "done";
  const qc = useQueryClient();
  const can = usePermissionsStore((s) => s.can);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.title);
  const [saving, setSaving] = useState(false);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(issue.title);
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    if (!next || next === issue.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/issues/${issue.id}`, { title: next });
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function copy(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => toast(`${label} copied`, "success"),
        () => toast(`Couldn't copy ${label.toLowerCase()}`, "error"),
      );
    }
  }

  const issueLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/projects/${issue.project_id}#issue-${issue.id}`
      : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      onClick={onClick}
      className={cn(
        "group bg-surface border border-border rounded-lg p-3 flex items-start gap-3 hover:border-[var(--border-strong)] hover:shadow-md transition-all select-none",
        draggable
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-pointer",
        dragging && "shadow-lg ring-2 ring-brand/30 rotate-1",
        className,
      )}
    >
      <span
        className={cn("w-4 h-4 shrink-0 mt-0.5", type.tint)}
        title={issue.type}
      >
        {type.icon}
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            disabled={saving}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="w-full text-sm font-medium leading-snug bg-surface-2 border border-brand rounded px-1.5 py-0.5 outline-none"
          />
        ) : (
          <p
            className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-brand transition"
            onDoubleClick={can("issue.edit") ? startEdit : undefined}
            title={can("issue.edit") ? "Double-click to edit" : undefined}
          >
            {issue.title}
          </p>
        )}
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
        {!editing && can("issue.edit") && (
          <Tooltip content="Edit title">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit title"
              className="w-4 h-4 text-muted/50 hover:text-brand transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
        <Tooltip content={`Priority: ${issue.priority}`}>
          <span
            className={cn("w-3.5 h-3.5 cursor-default", priorityColor[issue.priority])}
          >
            {priorityArrow[issue.priority]}
          </span>
        </Tooltip>
        {issue.assignee && (
          <UserHoverCard user={issue.assignee} side="top">
            <Avatar
              name={issue.assignee.name}
              src={issue.assignee.avatar}
              size="xs"
            />
          </UserHoverCard>
        )}
      </div>
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{issue.key ?? `#${issue.id}`}</ContextMenuLabel>
        {onClick && (
          <ContextMenuItem onSelect={onClick}>
            <ExternalLink />
            Open issue
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {issue.key && (
          <ContextMenuItem onSelect={() => copy(issue.key!, "Issue key")}>
            <Hash />
            Copy issue key
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => copy(issue.title, "Title")}>
          <TypeIcon />
          Copy title
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copy(issueLink, "Link")}>
          <Copy />
          Copy link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
