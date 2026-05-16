'use client';

import { use, useCallback, useMemo, useRef, useState } from 'react';
import { useDragCursor } from '@/hooks/useDragCursor';
import Link from 'next/link';
import { useSprints } from '@/hooks/useSprints';
import {
  useIssues,
  useRankIssue,
  useUpdateIssueStatus,
} from '@/hooks/useIssues';
import { useStatuses } from '@/hooks/useStatuses';
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
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { IssueDragPreview } from '@/components/issues/IssueDragPreview';
import { IssueDetail } from '@/components/issues/IssueDetail';
import { EmptyState, defaultIcons } from '@/components/ui/EmptyState';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonKanban } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import type { Issue } from '@/types';

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(id);
  const activeSprint = sprints.find((s) => s.status === 'active');

  if (sprintsLoading) {
    return <BoardSkeleton />;
  }

  if (!activeSprint) {
    const completedSprints =
      sprints.filter((s) => s.status === 'completed').length > 0;
    return (
      <div className="h-full p-8 overflow-auto flex items-center justify-center">
        <EmptyState
          icon={defaultIcons.board}
          title="No sprint is currently active"
          description={
            completedSprints
              ? 'Start a planned sprint from the Sprints tab to begin tracking work on the board.'
              : "Create and start a sprint to see your team's work on the kanban board."
          }
          action={
            <Link href={`/projects/${id}/sprints`}>
              <Button size="sm" variant="gradient">
                <Plus className="w-3.5 h-3.5" />
                Go to Sprints
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <BoardView
      projectId={id}
      sprintId={activeSprint.id}
      sprint={activeSprint}
    />
  );
}

function BoardView({
  projectId,
  sprintId,
  sprint,
}: {
  projectId: string;
  sprintId: number;
  sprint: { name: string };
}) {
  const { data: issues = [], isLoading } = useIssues({
    sprint_id: String(sprintId),
  });
  const { data: statuses = [] } = useStatuses(Number(projectId));
  const updateStatus = useUpdateIssueStatus();
  const rank = useRankIssue();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  // Local mirror of columns while a drag is in progress. While `mirror !== null`,
  // the UI renders straight from this — onDragOver mutates it for instant
  // rearrange, drop commits to the server, then we clear the mirror so we go
  // back to reading React Query cache. This avoids the cache-thrash that
  // happens if we patched on every onDragOver.
  type ColumnsMap = Record<string, Issue[]>;
  const [mirror, setMirror] = useState<ColumnsMap | null>(null);
  useDragCursor(!!activeIssue);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const cacheColumns = useMemo<ColumnsMap>(() => {
    const out: ColumnsMap = {};
    for (const s of statuses) {
      out[s.key] = issues
        .filter((i) => i.status === s.key)
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }
    return out;
  }, [statuses, issues]);

  const liveColumns = mirror ?? cacheColumns;

  const columns = useMemo(() => {
    return statuses.map((s) => ({ ...s, items: liveColumns[s.key] ?? [] }));
  }, [statuses, liveColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Resolve where the dragged card should land based on a dnd-kit event's
  // `over` value. Returns the target column key and (optionally) the card the
  // user is hovering over. Returns null if drop target is unknown.
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

  // Layout-shift caused by mirror updates can make onDragOver flip-flop between
  // two states (A → B → A → B → ...) → "Maximum update depth exceeded". Keep
  // the last few applied layouts so we can short-circuit oscillations.
  const recentLayoutsRef = useRef<string[]>([]);
  const fingerprint = (m: ColumnsMap) =>
    Object.keys(m)
      .sort()
      .map((k) => `${k}:${m[k].map((i) => i.id).join(',')}`)
      .join('|');

  function handleDragStart(e: DragStartEvent) {
    const issueId = Number(e.active.id);
    const issue = issues.find((i) => i.id === issueId);
    setActiveIssue(issue ?? null);
    // Seed the mirror from the current cache view so onDragOver has something
    // to mutate immediately.
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

      // Find current column of the dragged card in the mirror.
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
        // Cross-column: remove from old, insert into new at hovered position
        // (or append to end if dropping on the column container itself).
        const fromItems = cols[fromCol].filter((i) => i.id !== issueId);
        const toItems = cols[toCol].slice();
        const insertIdx = target.overIssue
          ? toItems.findIndex((i) => i.id === target.overIssue!.id)
          : toItems.length;
        const moved: Issue = { ...dragged, status: toCol as Issue['status'] };
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
    const draggedIssue = issues.find((i) => i.id === issueId);
    if (!draggedIssue) return clear();

    // Use the *mirror* as source of truth — that's the final post-drag layout.
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
    // Detect same-column same-slot (no-op).
    const cacheList = cacheColumns[finalCol] ?? [];
    const cacheIdx = cacheList.findIndex((i) => i.id === issueId);
    if (!movedColumn && cacheIdx === insertedAt) return clear();

    if (movedColumn) {
      // Status change. Rank within the new column is server-decided; refetch
      // via onSettled will reconcile if the server slots the card differently.
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
    <div className="h-full p-8 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{sprint.name}</h2>
          <Badge type="sprint" value="active" />
          <span className="text-xs text-muted">{issues.length} issues</span>
        </div>
        <Button
          size="sm"
          variant={selectMode ? 'primary' : 'ghost'}
          onClick={() => {
            setSelectMode((v) => !v);
            if (selectMode) setSelectedIds(new Set());
          }}
        >
          {selectMode ? 'Done' : 'Select'}
        </Button>
      </div>

      {isLoading ? (
        <SkeletonKanban />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          collisionDetection={closestCorners}
        >
          <div className="flex gap-4 h-full items-start">
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col}
                issues={col.items}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onIssueClick={(issue) => setSelectedIssue(issue)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeIssue && <IssueDragPreview issue={activeIssue} />}
          </DragOverlay>
        </DndContext>
      )}

      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

/**
 * Shared loading shell for both the sprint-resolution stage and the
 * issue-fetching stage. Keeping the outer structure identical across both
 * stages prevents the layout from jumping when one resolves before the
 * other.
 */
function BoardSkeleton() {
  return (
    <div className="h-full p-8 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <SkeletonKanban />
    </div>
  );
}
