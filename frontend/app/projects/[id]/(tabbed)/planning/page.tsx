"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIssues, useRankIssue } from "@/hooks/useIssues";
import { useSprints } from "@/hooks/useSprints";
import { usePermissionsStore } from "@/store/permissions";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Issue, Sprint } from "@/types";

const BACKLOG_COL = "backlog";

export default function PlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const { data: backlog = [], isLoading: backlogLoading } = useIssues({ project_id: id, sprint_id: null });
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(id);
  const loading = backlogLoading || sprintsLoading;
  const rank = useRankIssue();

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const canDrag = can("issue.edit");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Only planned + active sprints are editable in planning
  const planningSpints = useMemo(
    () => sprints.filter((s) => s.status !== "completed"),
    [sprints],
  );

  // Map sprint_id → issues (from sprint.issues)
  const sprintIssues = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const s of sprints) {
      map.set(s.id, s.issues ?? []);
    }
    return map;
  }, [sprints]);

  function onDragStart({ active }: DragStartEvent) {
    const issue = findIssue(active.id as number);
    setActiveIssue(issue ?? null);
  }

  function onDragOver({ over }: DragOverEvent) {
    setOverCol(over ? String(over.id) : null);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveIssue(null);
    setOverCol(null);
    if (!over) return;

    const issueId = active.id as number;
    const targetCol = String(over.id);

    if (targetCol === BACKLOG_COL) {
      rank.mutate({ id: issueId, clear_sprint: true });
    } else if (targetCol.startsWith("sprint:")) {
      const sprintId = Number(targetCol.replace("sprint:", ""));
      if (!isNaN(sprintId)) {
        rank.mutate({ id: issueId, sprint_id: sprintId });
      }
    }
  }

  function findIssue(id: number): Issue | undefined {
    for (const issues of sprintIssues.values()) {
      const found = issues.find((i) => i.id === id);
      if (found) return found;
    }
    return backlog.find((i) => i.id === id);
  }

  const allIssueIds = [
    ...backlog.map((i) => i.id),
    ...Array.from(sprintIssues.values()).flatMap((list) => list.map((i) => i.id)),
  ];

  if (!can("issue.view")) {
    return (
      <div className="h-full p-8 overflow-auto flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="font-semibold text-foreground mb-1">No access</p>
          <p className="text-sm text-muted leading-relaxed">
            You don't have permission to view issues in this project.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="flex gap-4 h-full items-start">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col shrink-0" style={{ width: 260 }}>
              <Skeleton className="h-5 w-24 mb-2" />
              <div className="flex-1 min-h-[120px] rounded-xl border-2 border-border p-1.5 space-y-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
        <div className="flex gap-4 h-full items-start">
            {canDrag ? (
              <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={allIssueIds} strategy={verticalListSortingStrategy}>
                  <ColumnsContent
                    backlog={backlog}
                    planningSpints={planningSpints}
                    sprintIssues={sprintIssues}
                    id={id}
                    overCol={overCol}
                    canDrag={canDrag}
                  />
                  <DragOverlay>
                    {activeIssue && (
                      <div className="surface-card shadow-lg p-2.5 rounded-lg text-sm font-medium opacity-95 w-60">
                        {activeIssue.title}
                      </div>
                    )}
                  </DragOverlay>
                </SortableContext>
              </DndContext>
            ) : (
              <ColumnsContent
                backlog={backlog}
                planningSpints={planningSpints}
                sprintIssues={sprintIssues}
                id={id}
                overCol={overCol}
                canDrag={canDrag}
              />
            )}
        </div>
    </div>
  );
}

function ColumnsContent({
  backlog,
  planningSpints,
  sprintIssues,
  id,
  overCol,
  canDrag,
}: {
  backlog: Issue[];
  planningSpints: Sprint[];
  sprintIssues: Map<number, Issue[]>;
  id: string;
  overCol: string | null;
  canDrag?: boolean;
}) {
  return (
    <>
      {/* Backlog column */}
      <PlanningColumn
        colId={BACKLOG_COL}
        title="Backlog"
        subtitle={`${backlog.length} issue${backlog.length !== 1 ? "s" : ""}`}
        issues={backlog}
        isOver={overCol === BACKLOG_COL}
        canDrag={canDrag}
      />

      {/* Sprint columns */}
      {planningSpints.map((sprint) => {
        const issues = sprintIssues.get(sprint.id) ?? [];
        const colId = `sprint:${sprint.id}`;
        return (
          <PlanningColumn
            key={sprint.id}
            colId={colId}
            title={sprint.name}
            subtitle={`${issues.length} issue${issues.length !== 1 ? "s" : ""}`}
            sprint={sprint}
            issues={issues}
            isOver={overCol === colId}
            canDrag={canDrag}
          />
        );
      })}

      {planningSpints.length === 0 && (
        <div className="surface-card p-8 text-center text-sm text-muted max-w-sm">
          No planned or active sprints. Create a sprint in the{" "}
          <Link href={`/projects/${id}`} className="text-brand hover:underline">
            Sprints tab
          </Link>{" "}
          to start planning.
        </div>
      )}
    </>
  );
}

function PlanningColumn({
  colId,
  title,
  subtitle,
  sprint,
  issues,
  isOver,
  canDrag,
}: {
  colId: string;
  title: string;
  subtitle: string;
  sprint?: Sprint;
  issues: Issue[];
  isOver: boolean;
  canDrag?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: colId });

  return (
    <div
      className="flex flex-col rounded-xl shrink-0"
      style={{ width: 260 }}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="font-semibold text-sm truncate flex-1">{title}</span>
        {sprint && <Badge type="sprint" value={sprint.status} />}
        <span className="text-xs text-muted">{subtitle}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl border-2 transition-colors p-1.5 space-y-1.5 ${
          isOver
            ? "border-brand bg-brand-soft/30"
            : "border-border bg-surface-2/50"
        }`}
      >
        {issues.map((issue) => (
          <PlanningIssueRow key={issue.id} issue={issue} canDrag={canDrag} />
        ))}
        {issues.length === 0 && (
          <p className="text-xs text-muted text-center py-6 italic">
            {isOver ? "Drop here" : "Empty"}
          </p>
        )}
      </div>
    </div>
  );
}

function PlanningIssueRow({ issue, canDrag }: { issue: Issue; canDrag?: boolean }) {
  const sortable = useSortable({ id: issue.id, disabled: !canDrag });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      className="surface-card p-2.5 rounded-lg flex items-start gap-2 text-xs hover:shadow-sm transition-shadow"
    >
      <span className="font-mono text-[10px] text-muted shrink-0 mt-0.5 w-14 truncate">
        {issue.key ?? `#${issue.id}`}
      </span>
      <span className="flex-1 text-foreground leading-snug truncate">{issue.title}</span>
      <Badge type="priority" value={issue.priority} className="shrink-0" />
    </div>
  );
}
