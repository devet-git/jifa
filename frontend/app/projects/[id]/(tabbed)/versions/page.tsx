"use client";

import { use, useState } from "react";
import { showConfirm } from "@/store/confirm";
import { usePermissionsStore } from "@/store/permissions";

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
import {
  useVersions,
  useCreateVersion,
  useUpdateVersion,
  useVersionAction,
  useDeleteVersion,
  useReorderVersions,
} from "@/hooks/useVersions";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Progress } from "@/components/ui/Progress";
import { Tooltip } from "@/components/ui/Tooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";
import { Calendar, GripVertical, Pencil, Plus, Rocket, RotateCcw, Trash2 } from "lucide-react";
import type { Version } from "@/types";

export default function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const { data: versions = [], isLoading } = useVersions(id);
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
    <div className="h-full p-8 overflow-auto max-w-4xl mx-auto w-full">
      <div className="flex justify-end mb-4">
        <PermissionGate perm="version.create" message="You don't have permission to create versions">
          <Button size="sm" variant={showAdd ? "secondary" : "gradient"} onClick={() => setShowAdd((v) => !v)} disabled={!can("version.create")}>
            {showAdd ? "Cancel" : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Version
              </>
            )}
          </Button>
        </PermissionGate>
      </div>
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
              <DatePicker
                className="!py-1.5 !text-xs !w-auto"
                value={draft.release_date}
                onChange={(v) => setDraft((d) => ({ ...d, release_date: v }))}
              />
              <div className="flex-1" />
              <Button type="submit" size="sm" variant="gradient" disabled={createVersion.isPending}>
                Create
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card p-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={defaultIcons.rocket}
            title="No versions yet"
            description="Versions help you plan and track releases. Create your first version to get started."
            action={
              !showAdd && (
                <PermissionGate perm="version.create">
                  <Button size="sm" variant="gradient" onClick={() => setShowAdd(true)} disabled={!can("version.create")}>
                    <Plus className="w-3.5 h-3.5" />
                    Create version
                  </Button>
                </PermissionGate>
              )
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={can("version.edit") ? handleDragEnd : undefined}
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
                    canEdit={can("version.edit")}
                    canRelease={can("version.release")}
                    canDelete={can("version.delete")}
                    onRelease={() =>
                      action.mutate({
                        id: v.id,
                        action:
                          v.status === "released" ? "unrelease" : "release",
                      })
                    }
                    onRename={(name) => update.mutate({ id: v.id, name })}
                    onDelete={async () => {
                      if (await showConfirm({ message: `Delete version "${v.name}"?`, variant: "danger" }))
                        remove.mutate(v.id);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
  );
}

function VersionRow({
  version,
  canEdit,
  canRelease,
  canDelete,
  onRelease,
  onRename,
  onDelete,
}: {
  version: Version;
  canEdit?: boolean;
  canRelease?: boolean;
  canDelete?: boolean;
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="surface-card p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        {canEdit && (
          <Tooltip content="Drag to reorder">
            <button
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
              className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
        {canEdit && editing ? (
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
            onClick={() => canEdit && setEditing(true)}
            className="font-semibold text-left flex-1 hover:bg-surface-2 rounded-md px-2 py-1 -mx-2 -my-1 transition truncate"
          >
            {version.name}
          </button>
        )}
        <Badge
          type={version.status === "released" ? "status" : "sprint"}
          value={version.status === "released" ? "done" : version.status}
        />
        <PermissionGate perm="version.release" message="You don't have permission to release versions">
          <Button
            size="sm"
            variant={version.status === "released" ? "secondary" : "gradient"}
            onClick={onRelease}
            disabled={!canRelease}
          >
            {version.status === "released" ? "Unrelease" : "Release"}
          </Button>
        </PermissionGate>
        <PermissionGate perm="version.delete" message="You don't have permission to delete versions">
          <Tooltip content="Delete version">
            <button
              onClick={onDelete}
              aria-label="Delete"
              disabled={!canDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </PermissionGate>
      </div>
      {version.description && (
        <p className="text-sm text-muted mb-2">{version.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted mb-2 flex-wrap">
        {version.release_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {version.release_date.slice(0, 10)}
          </span>
        )}
        {version.released_at && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Rocket className="w-3 h-3" />
            Released {version.released_at.slice(0, 10)}
          </span>
        )}
        <span className="font-medium">
          {done}/{total} issues done
        </span>
      </div>
      <Progress
        value={pct}
        indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
      />
    </li>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{version.name}</ContextMenuLabel>
        {canEdit && (
          <ContextMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Rename
          </ContextMenuItem>
        )}
        {canRelease && (
          <ContextMenuItem onSelect={onRelease}>
            {version.status === "released" ? <RotateCcw /> : <Rocket />}
            {version.status === "released" ? "Unrelease" : "Release"}
          </ContextMenuItem>
        )}
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem danger onSelect={onDelete}>
              <Trash2 />
              Delete version
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
