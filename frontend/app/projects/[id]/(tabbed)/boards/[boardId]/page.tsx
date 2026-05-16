"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArrowLeft, LogOut, SlidersHorizontal } from "lucide-react";

import { useBoard } from "@/hooks/useBoards";
import {
  useIssues,
  useRankIssue,
  useUpdateIssueStatus,
} from "@/hooks/useIssues";
import { useStatuses } from "@/hooks/useStatuses";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { IssueCard } from "@/components/issues/IssueCard";
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

  const filtered = useMemo(
    () => issues.filter((i) => matchesFilter(i, filter)),
    [issues, filter],
  );

  const columns = useMemo(
    () =>
      statuses.map((s) => ({
        ...s,
        items: filtered
          .filter((i) => i.status === s.key)
          .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
      })),
    [statuses, filtered],
  );

  const chips = filterChips(filter);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    const issue = filtered.find((i) => i.id === Number(e.active.id));
    setActiveIssue(issue ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = e;
    if (!over) return;
    const issueId = Number(active.id);
    const overId = String(over.id);
    const issue = filtered.find((i) => i.id === issueId);
    if (!issue) return;

    // Dropped on a column's empty area — over.id is the status key.
    const overCol = columns.find((c) => c.key === overId);
    if (overCol) {
      if (issue.status !== overCol.key) {
        updateStatus.mutate({ id: issueId, status: overCol.key });
      }
      return;
    }

    // Dropped on another card.
    const overIssue = filtered.find((i) => i.id === Number(overId));
    if (!overIssue) return;
    const targetCol = columns.find((c) => c.items.includes(overIssue));
    if (!targetCol) return;

    if (issue.status !== targetCol.key) {
      updateStatus.mutate({ id: issueId, status: targetCol.key });
      return;
    }

    const colItems = targetCol.items.filter((i) => i.id !== issueId);
    const idx = colItems.indexOf(overIssue);
    const before = colItems[idx - 1];
    const after = colItems[idx];
    rank.mutate({
      id: issueId,
      before_id: before?.id,
      after_id: after?.id,
    });
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
            onDragEnd={handleDragEnd}
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
              {activeIssue && <IssueCard issue={activeIssue} dragging />}
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
