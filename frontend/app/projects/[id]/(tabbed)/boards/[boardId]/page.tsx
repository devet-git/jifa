"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowLeft, LogOut, SlidersHorizontal } from "lucide-react";

import { useBoard } from "@/hooks/useBoards";
import { useDragCursor } from "@/hooks/useDragCursor";
import {
  useIssues,
  useRankIssue,
  useUpdateIssueStatus,
} from "@/hooks/useIssues";
import { useStatuses } from "@/hooks/useStatuses";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { IssueDragPreview } from "@/components/issues/IssueDragPreview";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonKanban } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { BacklogFilterState, Issue } from "@/types";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { id, boardId } = use(params);
  const { data: board, isLoading, isError } = useBoard(id, boardId);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-8 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-56 rounded" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 min-h-0 p-8 overflow-auto">
          <SkeletonKanban />
        </div>
      </div>
    );
  }

  if (isError || !board) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={defaultIcons.board}
          title="Board not found"
          description="The board may have been deleted, or you don't have access."
          action={
            <Link href={`/projects/${id}/settings`}>
              <Button size="sm" variant="ghost">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to settings
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  let filter: BacklogFilterState = {};
  try {
    filter = JSON.parse(board.filter || "{}");
  } catch {
    filter = {};
  }

  return (
    <BoardView
      projectId={id}
      boardId={boardId}
      boardName={board.name}
      filter={filter}
    />
  );
}

function BoardView({
  projectId,
  boardId,
  boardName,
  filter,
}: {
  projectId: string;
  boardId: string;
  boardName: string;
  filter: BacklogFilterState;
}) {
  const editFilterHref = `/projects/${projectId}/settings?tab=boards&board=${boardId}`;
  const { data: issues = [], isLoading } = useIssues({ project_id: projectId });
  const { data: statuses = [] } = useStatuses(Number(projectId));
  const updateStatus = useUpdateIssueStatus();
  const rank = useRankIssue();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  // Local mirror of columns during drag. See sprint board for rationale.
  type ColumnsMap = Record<string, Issue[]>;
  const [mirror, setMirror] = useState<ColumnsMap | null>(null);
  useDragCursor(!!activeIssue);

  const filtered = useMemo(
    () => issues.filter((i) => matchesFilter(i, filter)),
    [issues, filter],
  );

  const cacheColumns = useMemo<ColumnsMap>(() => {
    const out: ColumnsMap = {};
    for (const s of statuses) {
      out[s.key] = filtered
        .filter((i) => i.status === s.key)
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }
    return out;
  }, [statuses, filtered]);

  const liveColumns = mirror ?? cacheColumns;

  const columns = useMemo(
    () => statuses.map((s) => ({ ...s, items: liveColumns[s.key] ?? [] })),
    [statuses, liveColumns],
  );

  const chips = filterChips(filter);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function resolveTarget(
    overId: string,
    cols: ColumnsMap,
  ): { colKey: string; overIssue?: Issue } | null {
    if (cols[overId]) return { colKey: overId };
    const overIssueId = Number(overId);
    if (!Number.isFinite(overIssueId)) return null;
    for (const [colKey, items] of Object.entries(cols)) {
      const hit = items.find((i) => i.id === overIssueId);
      if (hit) return { colKey, overIssue: hit };
    }
    return null;
  }

  // Oscillation guard against onDragOver flip-flop (see board/page.tsx).
  const recentLayoutsRef = useRef<string[]>([]);
  const fingerprint = (m: ColumnsMap) =>
    Object.keys(m)
      .sort()
      .map((k) => `${k}:${m[k].map((i) => i.id).join(",")}`)
      .join("|");

  function handleDragStart(e: DragStartEvent) {
    const issue = filtered.find((i) => i.id === Number(e.active.id));
    setActiveIssue(issue ?? null);
    recentLayoutsRef.current = [fingerprint(cacheColumns)];
    setMirror(cacheColumns);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const issueId = Number(active.id);
    const overId = String(over.id);
    setMirror((prev) => {
      const cols = prev ?? cacheColumns;
      const target = resolveTarget(overId, cols);
      if (!target) return prev;

      let fromCol: string | null = null;
      for (const [colKey, items] of Object.entries(cols)) {
        if (items.some((i) => i.id === issueId)) {
          fromCol = colKey;
          break;
        }
      }
      if (!fromCol) return prev;

      const dragged = cols[fromCol].find((i) => i.id === issueId)!;
      const toCol = target.colKey;

      let candidate: ColumnsMap;
      if (fromCol !== toCol) {
        const fromItems = cols[fromCol].filter((i) => i.id !== issueId);
        const toItems = cols[toCol].slice();
        const insertIdx = target.overIssue
          ? toItems.findIndex((i) => i.id === target.overIssue!.id)
          : toItems.length;
        const moved: Issue = { ...dragged, status: toCol as Issue["status"] };
        toItems.splice(insertIdx, 0, moved);
        candidate = { ...cols, [fromCol]: fromItems, [toCol]: toItems };
      } else {
        const list = cols[fromCol];
        const fromIdx = list.findIndex((i) => i.id === issueId);
        const toIdx = target.overIssue
          ? list.findIndex((i) => i.id === target.overIssue!.id)
          : list.length - 1;
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = list.slice();
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        candidate = { ...cols, [fromCol]: next };
      }
      const fp = fingerprint(candidate);
      const recent = recentLayoutsRef.current;
      if (fp === recent[recent.length - 1]) return prev;
      if (recent.length >= 2 && fp === recent[recent.length - 2]) return prev;
      recentLayoutsRef.current = [...recent.slice(-3), fp];
      return candidate;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const clear = () => {
      setActiveIssue(null);
      setMirror(null);
      recentLayoutsRef.current = [];
    };
    if (!over) return clear();

    const issueId = Number(active.id);
    const draggedIssue = filtered.find((i) => i.id === issueId);
    if (!draggedIssue) return clear();

    const cols = mirror ?? cacheColumns;
    let finalCol: string | null = null;
    let finalList: Issue[] = [];
    for (const [colKey, items] of Object.entries(cols)) {
      if (items.some((i) => i.id === issueId)) {
        finalCol = colKey;
        finalList = items;
        break;
      }
    }
    if (!finalCol) return clear();

    const insertedAt = finalList.findIndex((i) => i.id === issueId);
    const before = insertedAt > 0 ? finalList[insertedAt - 1] : undefined;
    const after =
      insertedAt < finalList.length - 1 ? finalList[insertedAt + 1] : undefined;

    const movedColumn = draggedIssue.status !== finalCol;
    const cacheList = cacheColumns[finalCol] ?? [];
    const cacheIdx = cacheList.findIndex((i) => i.id === issueId);
    if (!movedColumn && cacheIdx === insertedAt) return clear();

    if (movedColumn) {
      updateStatus
        .mutateAsync({ id: issueId, status: finalCol })
        .finally(clear);
      return;
    }
    rank
      .mutateAsync({ id: issueId, before_id: before?.id, after_id: after?.id })
      .finally(clear);
  }

  function handleDragCancel() {
    setActiveIssue(null);
    setMirror(null);
    recentLayoutsRef.current = [];
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm truncate shrink-0">
            {boardName}
          </h2>
          <span className="text-xs text-muted shrink-0">
            {filtered.length}
            {filtered.length !== issues.length && (
              <span className="opacity-60">/{issues.length}</span>
            )}
          </span>
          {chips.length > 0 && (
            <div className="hidden md:flex items-center gap-1 flex-wrap min-w-0">
              {chips.map((c) => (
                <span
                  key={c}
                  className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-2 text-muted border border-border"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Link
              href={editFilterHref}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
              title="Edit board filter in settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </Link>
            <Link
              href={`/projects/${projectId}/settings?tab=boards`}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
              title="Exit board and back to board settings"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit
            </Link>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 min-h-0 p-8 overflow-auto">
        {isLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[280px] shrink-0 space-y-2">
                <Skeleton className="h-6 w-20" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : statuses.length === 0 ? (
          <EmptyState
            icon={defaultIcons.board}
            title="No statuses configured"
            description="Configure issue statuses in Project Settings to use the board."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={defaultIcons.board}
            title="No matching issues"
            description={
              issues.length === 0
                ? "This project has no issues yet."
                : "No issues match this board's filter. Try editing the filter in settings."
            }
            action={
              issues.length > 0 ? (
                <Link href={editFilterHref}>
                  <Button size="sm" variant="ghost">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Edit filter
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            collisionDetection={closestCorners}
          >
            <div className="flex gap-4 items-start min-h-full">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  status={col}
                  issues={col.items}
                  onIssueClick={(issue) => setSelectedIssue(issue)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeIssue && <IssueDragPreview issue={activeIssue} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

function matchesFilter(i: Issue, f: BacklogFilterState): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    const haystack =
      `${i.title} ${i.description ?? ""} ${i.key ?? ""}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (f.assignee_ids?.length) {
    if (!i.assignee_id || !f.assignee_ids.includes(i.assignee_id)) return false;
  }
  if (f.types?.length && !f.types.includes(i.type)) return false;
  if (f.priorities?.length && !f.priorities.includes(i.priority)) return false;
  if (f.label_ids?.length) {
    const issueLabelIds = (i.labels ?? []).map((l) => l.id);
    if (!f.label_ids.some((id) => issueLabelIds.includes(id))) return false;
  }
  return true;
}

function filterChips(f: BacklogFilterState): string[] {
  const out: string[] = [];
  if (f.q) out.push(`"${f.q}"`);
  if (f.types?.length) out.push(f.types.join("/"));
  if (f.priorities?.length) out.push(f.priorities.join("/"));
  if (f.assignee_ids?.length)
    out.push(
      `${f.assignee_ids.length} assignee${f.assignee_ids.length > 1 ? "s" : ""}`,
    );
  if (f.label_ids?.length)
    out.push(
      `${f.label_ids.length} label${f.label_ids.length > 1 ? "s" : ""}`,
    );
  return out;
}
