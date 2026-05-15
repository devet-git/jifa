"use client";

import { useState } from "react";
import {
  useIssueLinks,
  useCreateLink,
  useDeleteLink,
} from "@/hooks/useIssueLinks";
import { useIssues } from "@/hooks/useIssues";
import { usePermissionsStore } from "@/store/permissions";
import { PermissionGate } from "@/components/ui/PermissionGate";
import type { Issue, IssueLinkType } from "@/types";

interface Props {
  issue: Issue;
}

const linkLabels: Record<IssueLinkType, { outgoing: string; incoming: string }> = {
  blocks: { outgoing: "Blocks", incoming: "Blocked by" },
  relates: { outgoing: "Relates to", incoming: "Relates to" },
  duplicates: { outgoing: "Duplicates", incoming: "Duplicated by" },
};

export function LinksPanel({ issue }: Props) {
  const can = usePermissionsStore((s) => s.can);
  const canManage = can("issue.manage-link");
  const { data: links = [] } = useIssueLinks(issue.id);
  const create = useCreateLink(issue.id);
  const remove = useDeleteLink(issue.id);
  const { data: issues = [] } = useIssues({ project_id: issue.project_id });

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<{
    type: IssueLinkType;
    target_id: string;
  }>({ type: "blocks", target_id: "" });

  // Group by (type, direction).
  type Row = {
    label: string;
    linkId: number;
    other: { id: number; key?: string; title: string };
  };
  const rows: Row[] = links.map((l) => {
    const isOutgoing = l.source_id === issue.id;
    const other = isOutgoing ? l.target : l.source;
    const label = isOutgoing
      ? linkLabels[l.type].outgoing
      : linkLabels[l.type].incoming;
    return {
      label,
      linkId: l.id,
      other: {
        id: other?.id ?? (isOutgoing ? l.target_id : l.source_id),
        key: other?.key,
        title: other?.title ?? "(unknown)",
      },
    };
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.target_id) return;
    await create.mutateAsync({
      type: draft.type,
      target_id: Number(draft.target_id),
    });
    setDraft({ type: "blocks", target_id: "" });
    setShowAdd(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Links</p>
        <PermissionGate perm="issue.manage-link" message="Bạn không có quyền quản lý liên kết">
          <button
            onClick={() => canManage && setShowAdd((v) => !v)}
            className="text-xs text-blue-500 hover:underline"
          >
            {showAdd ? "Cancel" : "+ Add link"}
          </button>
        </PermissionGate>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-3 flex gap-2 items-center text-sm"
        >
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as IssueLinkType,
              }))
            }
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="blocks">Blocks</option>
            <option value="relates">Relates to</option>
            <option value="duplicates">Duplicates</option>
          </select>
          <select
            value={draft.target_id}
            onChange={(e) =>
              setDraft((d) => ({ ...d, target_id: e.target.value }))
            }
            className="flex-1 border rounded px-2 py-1 text-xs"
          >
            <option value="">Select an issue…</option>
            {issues
              .filter((i) => i.id !== issue.id)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.key ?? `#${i.id}`} — {i.title}
                </option>
              ))}
          </select>
          <button
            type="submit"
            className="text-xs bg-blue-600 text-white rounded px-2 py-1 disabled:opacity-50"
            disabled={!draft.target_id || create.isPending}
          >
            Add
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No linked issues.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={r.linkId}
              className="flex items-center gap-2 text-sm border rounded px-2 py-1"
            >
              <span className="text-xs text-gray-500 w-24 shrink-0">
                {r.label}
              </span>
              <span className="text-xs font-mono text-gray-400 shrink-0">
                {r.other.key ?? `#${r.other.id}`}
              </span>
              <span className="flex-1 truncate">{r.other.title}</span>
              <PermissionGate perm="issue.manage-link" message="Bạn không có quyền quản lý liên kết">
                <button
                  onClick={() => canManage && remove.mutate(r.linkId)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </PermissionGate>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
