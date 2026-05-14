"use client";

import { use, useState } from "react";
import Link from "next/link";
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
import { useProject } from "@/hooks/useProject";
import {
  useVersions,
  useCreateVersion,
  useUpdateVersion,
  useVersionAction,
  useDeleteVersion,
  useReorderVersions,
} from "@/hooks/useVersions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Version } from "@/types";

export default function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { data: versions = [] } = useVersions(id);
  const createVersion = useCreateVersion(id);
  const action = useVersionAction(id);
  const update = useUpdateVersion(id);
  const remove = useDeleteVersion(id);
  const reorder = useReorderVersions(id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = versions.findIndex((v) => v.id === Number(e.active.id));
    const to = versions.findIndex((v) => v.id === Number(e.over!.id));
    if (from < 0 || to < 0) return;
    const next = [...versions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((v) => v.id));
  }

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    release_date: string;
  }>({ name: "", description: "", release_date: "" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    // Backend expects RFC3339; date inputs emit "YYYY-MM-DD" which Go can't
    // parse as *time.Time. Promote to midnight UTC.
    const releaseDate = draft.release_date
      ? new Date(`${draft.release_date}T00:00:00Z`).toISOString()
      : undefined;
    await createVersion.mutateAsync({
      name: draft.name,
      description: draft.description,
      release_date: releaseDate,
    });
    setDraft({ name: "", description: "", release_date: "" });
    setShowAdd(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-7 pb-4 border-b border-border bg-surface">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand transition mb-2"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {project?.name}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Versions</h1>
          <Button size="sm" variant={showAdd ? "secondary" : "gradient"} onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Version
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto max-w-4xl mx-auto w-full">
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="surface-card p-4 mb-6 space-y-3"
          >
            <input
              required
              className="input"
              placeholder="Version name (e.g. v1.0.0)"
              autoFocus
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Description"
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">Planned release</label>
              <input
                type="date"
                className="input !py-1.5 !text-xs !w-auto"
                value={draft.release_date}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, release_date: e.target.value }))
                }
              />
              <div className="flex-1" />
              <Button type="submit" size="sm" variant="gradient" disabled={createVersion.isPending}>
                Create
              </Button>
            </div>
          </form>
        )}

        {versions.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5 9 21l11-11M3 12l9 9 9-18" />
              </svg>
            </div>
            <p className="font-medium mb-1">No versions yet</p>
            <p className="text-sm text-muted">
              Create your first version to track project releases.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={versions.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {versions.map((v) => (
                  <VersionRow
                    key={v.id}
                    version={v}
                    onRelease={() =>
                      action.mutate({
                        id: v.id,
                        action:
                          v.status === "released" ? "unrelease" : "release",
                      })
                    }
                    onRename={(name) => update.mutate({ id: v.id, name })}
                    onDelete={() => {
                      if (confirm(`Delete version "${v.name}"?`))
                        remove.mutate(v.id);
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

function VersionRow({
  version,
  onRelease,
  onRename,
  onDelete,
}: {
  version: Version;
  onRelease: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: version.id });
  const total = version.issue_count ?? 0;
  const done = version.completed_count ?? 0;
  const pct = total ? (done / total) * 100 : 0;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(version.name);

  function saveName() {
    setEditing(false);
    if (name.trim() && name !== version.name) onRename(name.trim());
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="surface-card p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors shrink-0"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
        {editing ? (
          <input
            autoFocus
            className="input !py-1.5 font-semibold flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-semibold text-left flex-1 hover:bg-surface-2 rounded-md px-2 py-1 -mx-2 -my-1 transition truncate"
          >
            {version.name}
          </button>
        )}
        <Badge
          type={version.status === "released" ? "status" : "sprint"}
          value={version.status === "released" ? "done" : version.status}
        />
        <Button
          size="sm"
          variant={version.status === "released" ? "secondary" : "gradient"}
          onClick={onRelease}
        >
          {version.status === "released" ? "Unrelease" : "Release"}
        </Button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
      {version.description && (
        <p className="text-sm text-muted mb-2">{version.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted mb-2 flex-wrap">
        {version.release_date && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {version.release_date.slice(0, 10)}
          </span>
        )}
        {version.released_at && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
            Released {version.released_at.slice(0, 10)}
          </span>
        )}
        <span className="font-medium">
          {done}/{total} issues done
        </span>
      </div>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}
