"use client";

import { useState } from "react";
import { showConfirm } from "@/store/confirm";
import { useUsers } from "@/hooks/useUsers";
import { useBulkIssue, type BulkPatch } from "@/hooks/useBulkIssue";
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
      !(await showConfirm({ message: `Delete ${selectedIds.length} issue(s)? This cannot be undone.`, variant: "danger" }))
    )
      return;
    await bulk.mutateAsync({ issue_ids: selectedIds, delete: true });
    onClear();
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>
      <span className="w-px h-5 bg-gray-700" />

      <PickerSelect
        label="Status"
        options={STATUSES.map((s) => ({ value: s, label: s }))}
        onPick={(v) => applyPatch({ status: v as IssueStatus })}
      />
      <PickerSelect
        label="Priority"
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        onPick={(v) => applyPatch({ priority: v as IssuePriority })}
      />
      <PickerSelect
        label="Type"
        options={TYPES.map((t) => ({ value: t, label: t }))}
        onPick={(v) => applyPatch({ type: v as IssueType })}
      />
      <PickerSelect
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
      <PickerSelect
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
        Delete
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

function PickerSelect({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-gray-200 hover:text-white"
      >
        {label} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 bg-white text-gray-900 rounded-lg shadow-lg w-48 max-h-64 overflow-auto z-50">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onPick(o.value);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
