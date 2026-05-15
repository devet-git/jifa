"use client";

import { showConfirm } from "@/store/confirm";
import { useUsers } from "@/hooks/useUsers";
import { useBulkIssue, type BulkPatch } from "@/hooks/useBulkIssue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown, Trash2, Search, X } from "lucide-react";
import { useState } from "react";
import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  Sprint,
} from "@/types";

interface Props {
  selectedIds: number[];
  sprints: Sprint[];
  onClear: () => void;
}

const STATUSES: IssueStatus[] = ["todo", "in_progress", "in_review", "done"];
const PRIORITIES: IssuePriority[] = ["low", "medium", "high", "urgent"];
const TYPES: IssueType[] = ["task", "bug", "story", "epic"];

export function BulkActionBar({ selectedIds, sprints, onClear }: Props) {
  const { data: users = [] } = useUsers();
  const bulk = useBulkIssue();

  async function applyPatch(patch: BulkPatch) {
    await bulk.mutateAsync({ issue_ids: selectedIds, patch });
  }
  async function handleDelete() {
    if (
      !(await showConfirm({
        message: `Delete ${selectedIds.length} issue(s)? This cannot be undone.`,
        variant: "danger",
      }))
    )
      return;
    await bulk.mutateAsync({ issue_ids: selectedIds, delete: true });
    onClear();
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <span className="w-px h-5 bg-gray-700" />

      <PickerMenu
        label="Status"
        options={STATUSES.map((s) => ({ value: s, label: s }))}
        onPick={(v) => applyPatch({ status: v as IssueStatus })}
      />
      <PickerMenu
        label="Priority"
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        onPick={(v) => applyPatch({ priority: v as IssuePriority })}
      />
      <PickerMenu
        label="Type"
        options={TYPES.map((t) => ({ value: t, label: t }))}
        onPick={(v) => applyPatch({ type: v as IssueType })}
      />
      <PickerMenu
        label="Assignee"
        options={[
          { value: "_clear", label: "Unassigned" },
          ...users.map((u) => ({ value: String(u.id), label: u.name })),
        ]}
        onPick={(v) =>
          applyPatch(
            v === "_clear" ? { clear_assignee: true } : { assignee_id: Number(v) },
          )
        }
      />
      <PickerMenu
        label="Sprint"
        options={[
          { value: "_clear", label: "Backlog" },
          ...sprints
            .filter((s) => s.status !== "completed")
            .map((s) => ({ value: String(s.id), label: s.name })),
        ]}
        onPick={(v) =>
          applyPatch(
            v === "_clear" ? { clear_sprint: true } : { sprint_id: Number(v) },
          )
        }
      />

      <span className="w-px h-5 bg-gray-700" />
      <button
        onClick={handleDelete}
        className="text-sm text-red-300 hover:text-red-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onClear}
        className="text-sm text-gray-400 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}

function PickerMenu({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm text-gray-200 hover:text-white outline-none">
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="max-h-80 overflow-hidden"
      >
        {options.length > 0 && (
          <div className="flex items-center gap-1 border-b border-border px-2 pb-1 mb-1">
            <Search className="w-3 h-3 shrink-0 text-muted" />
            <input
              autoFocus
              placeholder="Search..."
              className="flex-1 py-1 text-xs bg-transparent outline-none placeholder:text-muted-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted hover:text-foreground transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">
              {query ? "No results found." : "No options."}
            </p>
          ) : (
            filtered.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onSelect={() => onPick(o.value)}
                className="capitalize"
              >
                {o.label}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
