"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/api";
import { useProject } from "@/hooks/useProject";
import {
  useMembers,
  useAddMember,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/hooks/useMembers";
import {
  useComponents,
  useCreateComponent,
  useUpdateComponent,
  useDeleteComponent,
} from "@/hooks/useComponents";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
} from "@/hooks/useWebhooks";
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useReorderStatuses,
  useDeleteStatus,
} from "@/hooks/useStatuses";
import {
  useBoards,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
} from "@/hooks/useBoards";
import { useAudit } from "@/hooks/useAudit";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type {
  BacklogFilterState,
  Board,
  Component,
  IssuePriority,
  IssueType,
  ProjectRole,
  StatusCategory,
  StatusDefinition,
  Webhook,
  WebhookEvent,
} from "@/types";

type Tab =
  | "members"
  | "workflow"
  | "boards"
  | "components"
  | "webhooks"
  | "audit"
  | "details";

const STATUS_COLORS = [
  "#9ca3af",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#a78bfa",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "comment.created",
  "sprint.started",
  "sprint.completed",
];

const roleLabels: Record<ProjectRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleColors: Record<ProjectRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  member: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("members");

  const { data: project } = useProject(id);
  const { data: members = [] } = useMembers(id);
  const { user } = useAuthStore();

  const addMember = useAddMember(id);
  const updateRole = useUpdateMemberRole(id);
  const removeMember = useRemoveMember(id);

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "admin";

  const [form, setForm] = useState<{ email: string; role: ProjectRole }>({
    email: "",
    role: "member",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addMember.mutateAsync(form);
      setForm({ email: "", role: "member" });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add member");
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "workflow", label: "Workflow" },
    { key: "boards", label: "Boards" },
    { key: "components", label: "Components" },
    { key: "webhooks", label: "Webhooks" },
    { key: "audit", label: "Audit" },
    { key: "details", label: "Details" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-7 pb-0 border-b border-border bg-surface">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand transition mb-2"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {project?.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Project settings</h1>
        <div className="flex gap-0.5 -mb-px overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.key
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {tab === "members" && (
          <div className="max-w-3xl">
            {isAdmin && (
              <form
                onSubmit={handleAdd}
                className="bg-white border rounded-xl p-4 mb-6"
              >
                <h2 className="font-semibold text-gray-700 mb-3">Add member</h2>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as ProjectRole,
                      }))
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button type="submit" disabled={addMember.isPending}>
                    {addMember.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}
              </form>
            )}

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">
                  Team{" "}
                  <span className="text-gray-400 font-normal">
                    ({members.length})
                  </span>
                </h2>
              </div>
              <ul className="divide-y">
                {members.map((m) => {
                  const isOwner = project?.owner_id === m.user_id;
                  return (
                    <li
                      key={m.id}
                      className="px-4 py-3 flex items-center gap-3"
                    >
                      <Avatar name={m.user?.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {m.user?.name}
                          {isOwner && (
                            <span className="ml-2 text-xs text-gray-400">
                              (owner)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {m.user?.email}
                        </p>
                      </div>
                      {isAdmin && !isOwner ? (
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          value={m.role}
                          onChange={(e) =>
                            updateRole.mutate({
                              memberId: m.id,
                              role: e.target.value as ProjectRole,
                            })
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span
                          className={`text-xs px-2 py-1 rounded ${roleColors[m.role]}`}
                        >
                          {roleLabels[m.role]}
                        </span>
                      )}
                      {isAdmin && !isOwner && (
                        <button
                          onClick={() => {
                            if (confirm("Remove this member?"))
                              removeMember.mutate(m.id);
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  );
                })}
                {members.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-400">
                    No members yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {tab === "components" && (
          <ComponentsTab projectId={id} isAdmin={isAdmin} />
        )}

        {tab === "workflow" && (
          <WorkflowTab projectId={id} isAdmin={isAdmin} />
        )}

        {tab === "boards" && <BoardsTab projectId={id} />}

        {tab === "webhooks" && <WebhooksTab projectId={id} />}

        {tab === "audit" && <AuditTab projectId={id} />}

        {tab === "details" && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-gray-700 mb-3">Details</h2>
              <dl className="text-sm space-y-2">
                <div className="flex gap-2">
                  <dt className="w-24 text-gray-500">Name</dt>
                  <dd className="font-medium">{project?.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 text-gray-500">Key</dt>
                  <dd className="font-mono">{project?.key}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 text-gray-500">Description</dt>
                  <dd>{project?.description ?? "—"}</dd>
                </div>
              </dl>
            </div>
            <ImportExportSection projectId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTab({ projectId }: { projectId: string }) {
  const { data: entries = [] } = useAudit(projectId);
  return (
    <div className="max-w-3xl">
      <div className="bg-white border rounded-xl overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No audit entries yet.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 flex gap-3 text-sm">
                <Avatar name={e.actor?.name ?? "?"} size="sm" />
                <div className="flex-1 min-w-0">
                  <p>
                    <span className="font-medium">
                      {e.actor?.name ?? "Someone"}
                    </span>{" "}
                    <span className="text-gray-500">
                      {humanAction(e.action)}
                    </span>{" "}
                    {e.details && (
                      <span className="text-gray-700">— {e.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function humanAction(a: string) {
  return (
    {
      "member.added": "added a member",
      "member.removed": "removed a member",
      "member.role_changed": "changed a role",
      "status.created": "added a status",
      "status.deleted": "removed a status",
      "version.released": "released a version",
      "webhook.created": "added a webhook",
    }[a] ?? a.replace(".", " ")
  );
}

function BoardsTab({ projectId }: { projectId: string }) {
  const { data: boards = [] } = useBoards(projectId);
  const create = useCreateBoard(projectId);
  const update = useUpdateBoard(projectId);
  const remove = useDeleteBoard(projectId);
  const [draftName, setDraftName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) return;
    await create.mutateAsync({ name: draftName.trim(), filter: "{}" });
    setDraftName("");
  }

  return (
    <div className="max-w-3xl space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border rounded-xl p-4 flex gap-2"
      >
        <input
          required
          placeholder="Board name (e.g. Frontend Kanban)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <Button type="submit" disabled={create.isPending}>
          Add board
        </Button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <ul className="divide-y">
          {boards.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No boards yet. Add one to create a saved Kanban view.
            </li>
          )}
          {boards.map((b) => (
            <BoardRow
              key={b.id}
              projectId={projectId}
              board={b}
              onRename={(name) =>
                update.mutate({ id: b.id, name, filter: b.filter })
              }
              onFilter={(filter) =>
                update.mutate({ id: b.id, name: b.name, filter })
              }
              onDelete={() => {
                if (confirm(`Delete board "${b.name}"?`)) remove.mutate(b.id);
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function BoardRow({
  projectId,
  board,
  onRename,
  onFilter,
  onDelete,
}: {
  projectId: string;
  board: Board;
  onRename: (name: string) => void;
  onFilter: (filter: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [showFilter, setShowFilter] = useState(false);

  let parsed: BacklogFilterState = {};
  try {
    parsed = JSON.parse(board.filter || "{}");
  } catch {
    /* ignore */
  }

  const summary: string[] = [];
  if (parsed.types?.length) summary.push(`type: ${parsed.types.join(", ")}`);
  if (parsed.priorities?.length)
    summary.push(`priority: ${parsed.priorities.join(", ")}`);
  if (parsed.assignee_ids?.length)
    summary.push(`${parsed.assignee_ids.length} assignees`);
  if (parsed.label_ids?.length)
    summary.push(`${parsed.label_ids.length} labels`);
  if (parsed.q) summary.push(`text: "${parsed.q}"`);

  function save() {
    setEditing(false);
    if (name.trim() && name !== board.name) onRename(name.trim());
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="border rounded px-2 py-1 text-sm w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-medium text-sm hover:bg-gray-50 rounded px-1 text-left truncate"
            >
              {board.name}
            </button>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {summary.length > 0 ? summary.join(" · ") : "No filter applied"}
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/boards/${board.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          Open
        </Link>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          {showFilter ? "Hide filter" : "Edit filter"}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
      {showFilter && (
        <BoardFilterEditor
          value={parsed}
          onChange={(v) => onFilter(JSON.stringify(v))}
        />
      )}
    </li>
  );
}

function BoardFilterEditor({
  value,
  onChange,
}: {
  value: BacklogFilterState;
  onChange: (v: BacklogFilterState) => void;
}) {
  const TYPES: IssueType[] = ["task", "bug", "story", "epic"];
  const PRIORITIES: IssuePriority[] = ["low", "medium", "high", "urgent"];

  function toggle<T extends string>(
    arr: T[] | undefined,
    item: T,
  ): T[] {
    const set = new Set(arr ?? []);
    set.has(item) ? set.delete(item) : set.add(item);
    return Array.from(set);
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 w-16">Types:</span>
        {TYPES.map((t) => (
          <label
            key={t}
            className={`px-2 py-0.5 rounded cursor-pointer border ${
              value.types?.includes(t)
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={value.types?.includes(t) ?? false}
              onChange={() =>
                onChange({ ...value, types: toggle(value.types, t) })
              }
            />
            {t}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 w-16">Priority:</span>
        {PRIORITIES.map((p) => (
          <label
            key={p}
            className={`px-2 py-0.5 rounded cursor-pointer border ${
              value.priorities?.includes(p)
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={value.priorities?.includes(p) ?? false}
              onChange={() =>
                onChange({
                  ...value,
                  priorities: toggle(value.priorities, p),
                })
              }
            />
            {p}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 w-16">Text:</span>
        <input
          placeholder="match in title/description"
          className="border rounded px-2 py-1 text-xs flex-1"
          value={value.q ?? ""}
          onChange={(e) =>
            onChange({ ...value, q: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}

function WorkflowTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const { data: statuses = [] } = useStatuses(projectId);
  const create = useCreateStatus(projectId);
  const update = useUpdateStatus(projectId);
  const remove = useDeleteStatus(projectId);
  const reorder = useReorderStatuses(projectId);
  const [draft, setDraft] = useState<{
    name: string;
    category: StatusCategory;
    color: string;
  }>({ name: "", category: "todo", color: STATUS_COLORS[0] });
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = draft.name.trim();
    if (!name) return;
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9_ -]/g, "")
      .replace(/[ -]+/g, "_");
    try {
      await create.mutateAsync({
        key,
        name,
        category: draft.category,
        color: draft.color,
      });
      setDraft({ name: "", category: "todo", color: STATUS_COLORS[0] });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add status");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = statuses.findIndex((s) => s.id === Number(e.active.id));
    const to = statuses.findIndex((s) => s.id === Number(e.over!.id));
    if (from < 0 || to < 0) return;
    const next = [...statuses];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((s) => s.id));
  }

  return (
    <div className="max-w-3xl space-y-4">
      {isAdmin && (
        <form
          onSubmit={handleAdd}
          className="bg-white border rounded-xl p-4 space-y-3"
        >
          <h2 className="font-semibold text-gray-700">Add status</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              required
              placeholder="Status name (e.g. Blocked)"
              className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
            <select
              className="border rounded-lg px-2 py-2 text-sm"
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  category: e.target.value as StatusCategory,
                }))
              }
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <ColorPicker
              value={draft.color}
              onChange={(c) => setDraft((d) => ({ ...d, color: c }))}
            />
            <Button type="submit" disabled={create.isPending}>
              Add
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        {statuses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No statuses configured.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={statuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y">
                {statuses.map((s) => (
                  <StatusRow
                    key={s.id}
                    s={s}
                    isAdmin={isAdmin}
                    onRename={(name) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name,
                        category: s.category,
                        color: s.color,
                      })
                    }
                    onColor={(c) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name: s.name,
                        category: s.category,
                        color: c,
                      })
                    }
                    onCategory={(category) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name: s.name,
                        category,
                        color: s.color,
                      })
                    }
                    onDelete={async () => {
                      if (!confirm(`Delete status "${s.name}"?`)) return;
                      try {
                        await remove.mutateAsync(s.id);
                      } catch (err: any) {
                        alert(err.response?.data?.error ?? "Failed to delete");
                      }
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  s,
  isAdmin,
  onRename,
  onColor,
  onCategory,
  onDelete,
}: {
  s: StatusDefinition;
  isAdmin: boolean;
  onRename: (name: string) => void;
  onColor: (c: string) => void;
  onCategory: (c: StatusCategory) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);

  function save() {
    setEditing(false);
    if (name.trim() && name !== s.name) onRename(name.trim());
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="px-4 py-3 flex items-center gap-3 bg-white"
    >
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing select-none"
          title="Drag to reorder"
        >
          ⋮⋮
        </button>
      )}
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: s.color || "#94a3b8" }}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            className="border rounded px-2 py-1 text-sm w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            onClick={() => isAdmin && setEditing(true)}
            className="font-medium text-sm hover:bg-gray-50 rounded px-1 text-left truncate"
          >
            {s.name}
          </button>
        )}
        <p className="text-[10px] font-mono text-gray-400 truncate">{s.key}</p>
      </div>
      {isAdmin ? (
        <>
          <ColorPicker value={s.color ?? "#94a3b8"} onChange={onColor} />
          <select
            className="border rounded px-2 py-1 text-xs"
            value={s.category}
            onChange={(e) => onCategory(e.target.value as StatusCategory)}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <button
            onClick={onDelete}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </>
      ) : (
        <span className="text-xs text-gray-500">{s.category}</span>
      )}
    </li>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {STATUS_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`w-4 h-4 rounded-full border-2 transition ${
            value === c ? "border-gray-800" : "border-transparent"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function WebhooksTab({ projectId }: { projectId: string }) {
  const { data: hooks = [] } = useWebhooks(projectId);
  const create = useCreateWebhook(projectId);
  const update = useUpdateWebhook(projectId);
  const remove = useDeleteWebhook(projectId);
  const [draft, setDraft] = useState<{
    url: string;
    events: WebhookEvent[];
  }>({ url: "", events: ["issue.created", "issue.updated"] });
  const [newSecret, setNewSecret] = useState<string | null>(null);

  function toggleEvent(e: WebhookEvent) {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(e)
        ? d.events.filter((x) => x !== e)
        : [...d.events, e],
    }));
  }

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft.url.trim() || draft.events.length === 0) return;
    const created = await create.mutateAsync({
      url: draft.url.trim(),
      events: draft.events,
    });
    setDraft({ url: "", events: ["issue.created", "issue.updated"] });
    if (created.secret) setNewSecret(created.secret);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white border rounded-xl p-4 space-y-3"
      >
        <h2 className="font-semibold text-gray-700">Add webhook</h2>
        <input
          required
          type="url"
          placeholder="https://example.com/jifa-webhook"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        />
        <div>
          <p className="text-xs text-gray-500 mb-1">Events</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WEBHOOK_EVENTS.map((e) => (
              <label
                key={e}
                className={`px-2 py-1 rounded text-xs border cursor-pointer ${
                  draft.events.includes(e)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={draft.events.includes(e)}
                  onChange={() => toggleEvent(e)}
                />
                {e}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!draft.url.trim() || draft.events.length === 0}
          >
            Add webhook
          </Button>
        </div>
      </form>

      {newSecret && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-medium mb-2">
            Webhook secret — save it now, you won&apos;t see it again:
          </p>
          <code className="block bg-white border rounded px-2 py-1 text-xs break-all">
            {newSecret}
          </code>
          <button
            onClick={() => setNewSecret(null)}
            className="text-xs text-gray-500 hover:underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <ul className="divide-y">
          {hooks.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No webhooks yet.
            </li>
          )}
          {hooks.map((h) => (
            <WebhookRow
              key={h.id}
              hook={h}
              onToggle={() =>
                update.mutate({
                  id: h.id,
                  url: h.url,
                  events: h.events_list,
                  active: !h.active,
                })
              }
              onDelete={() => {
                if (confirm(`Delete webhook to ${h.url}?`))
                  remove.mutate(h.id);
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function WebhookRow({
  hook,
  onToggle,
  onDelete,
}: {
  hook: Webhook;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate" title={hook.url}>
          {hook.url}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {hook.events_list.join(", ") || "—"}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`text-xs px-2 py-1 rounded ${
          hook.active
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {hook.active ? "Active" : "Paused"}
      </button>
      <button
        onClick={onDelete}
        className="text-xs text-red-600 hover:underline"
      >
        Remove
      </button>
    </li>
  );
}

function ImportExportSection({ projectId }: { projectId: string }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  async function downloadCsv() {
    // Fetch through the authed axios instance, then trigger a save.
    const res = await api.get(`/projects/${projectId}/export/issues.csv`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "issues.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function uploadCsv(file: File) {
    setImporting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(
        `/projects/${projectId}/import/issues`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["issues"] });
    } catch (err: any) {
      setResult({
        created: 0,
        errors: [err.response?.data?.error ?? String(err)],
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className="font-semibold text-gray-700 mb-3">Import / Export</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant="secondary" onClick={downloadCsv}>
          ⬇ Export issues CSV
        </Button>
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          {importing ? "Importing…" : "⬆ Import from CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) uploadCsv(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Required column: <code>title</code>. Optional columns: <code>type</code>
        , <code>status</code>, <code>priority</code>, <code>story_points</code>,
        <code> start_date</code>, <code>due_date</code>,{" "}
        <code>assignee_email</code>, <code>sprint</code>, <code>version</code>,{" "}
        <code>epic</code>, <code>labels</code>, <code>components</code>,{" "}
        <code>description</code>. Dates use ISO format (YYYY-MM-DD); labels and
        components are comma-separated.
      </p>
      {result && (
        <div
          className={`text-sm rounded p-3 ${
            result.errors.length ? "bg-yellow-50" : "bg-green-50"
          }`}
        >
          <p className="font-medium mb-1">
            Imported {result.created} issue{result.created === 1 ? "" : "s"}.
          </p>
          {result.errors.length > 0 && (
            <ul className="list-disc list-inside text-xs text-yellow-800 max-h-40 overflow-auto">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentsTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const { data: components = [] } = useComponents(projectId);
  const { data: users = [] } = useUsers();
  const create = useCreateComponent(projectId);
  const update = useUpdateComponent(projectId);
  const remove = useDeleteComponent(projectId);

  const [draft, setDraft] = useState<{ name: string; lead_id: string }>({
    name: "",
    lead_id: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await create.mutateAsync({
      name: draft.name.trim(),
      lead_id: draft.lead_id ? Number(draft.lead_id) : undefined,
    });
    setDraft({ name: "", lead_id: "" });
  }

  return (
    <div className="max-w-3xl">
      <form
        onSubmit={handleAdd}
        className="bg-white border rounded-xl p-4 mb-6 flex gap-2"
      >
        <input
          required
          placeholder="Component name"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={draft.name}
          onChange={(e) =>
            setDraft((d) => ({ ...d, name: e.target.value }))
          }
        />
        <select
          className="border rounded-lg px-2 py-2 text-sm"
          value={draft.lead_id}
          onChange={(e) =>
            setDraft((d) => ({ ...d, lead_id: e.target.value }))
          }
        >
          <option value="">No lead</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={create.isPending}>
          Add
        </Button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <ul className="divide-y">
          {components.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No components yet.
            </li>
          )}
          {components.map((c) => (
            <ComponentRow
              key={c.id}
              c={c}
              users={users}
              isAdmin={isAdmin}
              onRename={(name) => update.mutate({ id: c.id, name })}
              onLead={(leadId) =>
                update.mutate({
                  id: c.id,
                  name: c.name,
                  lead_id: leadId,
                })
              }
              onDelete={() => {
                if (confirm(`Delete component "${c.name}"?`))
                  remove.mutate(c.id);
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ComponentRow({
  c,
  users,
  isAdmin,
  onRename,
  onLead,
  onDelete,
}: {
  c: Component;
  users: { id: number; name: string }[];
  isAdmin: boolean;
  onRename: (name: string) => void;
  onLead: (leadId: number | undefined) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  function save() {
    setEditing(false);
    if (name.trim() && name !== c.name) onRename(name.trim());
  }
  return (
    <li className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            className="border rounded px-2 py-1 text-sm w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-medium hover:bg-gray-50 rounded px-1 truncate"
          >
            {c.name}
          </button>
        )}
      </div>
      <select
        className="border rounded px-2 py-1 text-xs"
        value={c.lead_id ?? ""}
        onChange={(e) =>
          onLead(e.target.value ? Number(e.target.value) : undefined)
        }
      >
        <option value="">No lead</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {isAdmin && (
        <button
          onClick={onDelete}
          className="text-xs text-red-600 hover:underline"
        >
          Remove
        </button>
      )}
    </li>
  );
}
