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
import { Copy, ExternalLink, Hash, Type as TypeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue, IssueType, IssuePriority } from "@/types";

// SVG icons for each issue type — replace emoji to look professional.
const typeIcons: Record<IssueType, { icon: React.ReactNode; tint: string }> = {
  task: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path
          d="m8 12 3 3 5-6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    tint: "text-blue-500",
  },
  bug: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="11" r="1.4" fill="white" />
        <circle cx="15" cy="11" r="1.4" fill="white" />
      </svg>
    ),
    tint: "text-red-500",
  },
  story: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16v16H4z" opacity="0" />
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" />
      </svg>
    ),
    tint: "text-emerald-500",
  },
  epic: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    ),
    tint: "text-violet-500",
  },
  subtask: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
    tint: "text-cyan-500",
  },
};

const priorityArrow: Record<IssuePriority, React.ReactNode> = {
  low: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  high: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  urgent: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm0 7 6 10H6l6-10zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
    </svg>
  ),
};

const priorityColor: Record<IssuePriority, string> = {
  low: "text-slate-400",
  medium: "text-sky-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

interface Props {
  issue: Issue;
  onClick?: () => void;
  className?: string;
  dragging?: boolean;
}

export function IssueCard({ issue, onClick, className, dragging }: Props) {
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
        "group bg-surface border border-border rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-md transition-all select-none",
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
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
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
              className="opacity-0 group-hover:opacity-100 w-4 h-4 text-muted hover:text-brand transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
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
