"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSprints } from "@/hooks/useSprints";
import { useIssues, useRankIssue, useUpdateIssueStatus } from "@/hooks/useIssues";
import { useStatuses } from "@/hooks/useStatuses";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { IssueCard } from "@/components/issues/IssueCard";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonKanban } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import type { Issue } from "@/types";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(id);
  const activeSprint = sprints.find((s) => s.status === "active");

  if (sprintsLoading) {
    return <BoardSkeleton />;
  }

  if (!activeSprint) {
    const completedSprints = sprints.filter((s) => s.status === "completed").length > 0;
    return (
      <div className="h-full p-8 overflow-auto flex items-center justify-center">
        <EmptyState
          icon={defaultIcons.board}
          title="No sprint is currently active"
          description={
            completedSprints
              ? "Start a planned sprint from the Sprints tab to begin tracking work on the board."
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

  return <BoardView projectId={id} sprintId={activeSprint.id} sprint={activeSprint} />;
}

function BoardView({ projectId, sprintId, sprint }: { projectId: string; sprintId: number; sprint: { name: string } }) {
  const { data: issues = [], isLoading } = useIssues({ sprint_id: String(sprintId) });
  const { data: statuses = [] } = useStatuses(Number(projectId));
  const updateStatus = useUpdateIssueStatus();
  const rank = useRankIssue();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
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

  const columns = useMemo(() => {
    return statuses.map((s) => ({
      ...s,
      items: issues
        .filter((i) => i.status === s.key)
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    }));
  }, [statuses, issues]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    const issue = issues.find((i) => i.id === Number(e.active.id));
    setActiveIssue(issue ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = e;
    if (!over) return;
    const issueId = Number(active.id);
    const overId = String(over.id);

    if (overId.startsWith("col:")) {
      const newStatus = overId.replace("col:", "");
      updateStatus.mutate({ id: issueId, status: newStatus });
      return;
    }

    const overIssue = issues.find((i) => i.id === Number(overId));
    if (!overIssue) return;
    const overCol = columns.find((c) => c.items.includes(overIssue));
    if (!overCol) return;

    const sameCol = issues.find((i) => i.id === issueId)?.status === overCol.key;
    if (sameCol) {
      const colItems = overCol.items.filter((i) => i.id !== issueId);
      const idx = colItems.indexOf(overIssue);
      const before = colItems[idx - 1];
      const after = colItems[idx];
      rank.mutate({ id: issueId, before_id: before?.id, after_id: after?.id });
    }
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
          variant={selectMode ? "primary" : "ghost"}
          onClick={() => {
            setSelectMode((v) => !v);
            if (selectMode) setSelectedIds(new Set());
          }}
        >
          {selectMode ? "Done" : "Select"}
        </Button>
      </div>

      {isLoading ? (
        <SkeletonKanban />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
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
            {activeIssue && <IssueCard issue={activeIssue} dragging />}
          </DragOverlay>
        </DndContext>
      )}

      {selectedIssue && (
        <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
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
