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
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIssues, useRankIssue } from "@/hooks/useIssues";
import { useSprints } from "@/hooks/useSprints";
import { useDragCursor } from "@/hooks/useDragCursor";
import { usePermissionsStore } from "@/store/permissions";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";
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
  useDragCursor(!!activeIssue);

  const canDrag = can("issue.edit");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Only planned + active sprints are editable in planning
  const planningSpints = useMemo(
    () => sprints.filter((s) => s.status !== "completed"),
    [sprints],
  );

  // Live layout: cache view of each column, mirrored locally during a drag.
  type ColumnsMap = Record<string, Issue[]>;
  const cacheCols = useMemo<ColumnsMap>(() => {
    const out: ColumnsMap = { [BACKLOG_COL]: backlog };
    for (const s of sprints) out[`sprint:${s.id}`] = s.issues ?? [];
    return out;
  }, [backlog, sprints]);

  const [mirror, setMirror] = useState<ColumnsMap | null>(null);
  const liveCols = mirror ?? cacheCols;

  const sprintIssues = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const s of sprints) {
      map.set(s.id, liveCols[`sprint:${s.id}`] ?? s.issues ?? []);
    }
    return map;
  }, [sprints, liveCols]);
  const liveBacklog = liveCols[BACKLOG_COL] ?? backlog;

  function findFromCol(map: ColumnsMap, issueId: number): string | null {
    for (const [colId, list] of Object.entries(map)) {
      if (list.some((i) => i.id === issueId)) return colId;
    }
    return null;
  }

  // Oscillation guard.
  const recentLayoutsRef = useRef<string[]>([]);
  const fingerprint = (m: ColumnsMap) =>
    Object.keys(m)
      .sort()
      .map((k) => `${k}:${m[k].map((i) => i.id).join(",")}`)
      .join("|");

  function onDragStart({ active }: DragStartEvent) {
    const issueId = active.id as number;
    for (const list of Object.values(cacheCols)) {
      const found = list.find((i) => i.id === issueId);
      if (found) {
        setActiveIssue(found);
        break;
      }
    }
    recentLayoutsRef.current = [fingerprint(cacheCols)];
    setMirror(cacheCols);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    setOverCol(over ? String(over.id) : null);
    if (!over) return;
    const issueId = active.id as number;
    const overId = String(over.id);
    setMirror((prev) => {
      const map = prev ?? cacheCols;
      // Determine target column: overId may be a column id, or an issue id
      // (when hovering over a card inside a column).
      let toCol: string | null = null;
      if (map[overId]) toCol = overId;
      else {
        const num = Number(overId);
        if (Number.isFinite(num)) toCol = findFromCol(map, num);
      }
      if (!toCol) return prev;
      const fromCol = findFromCol(map, issueId);
      if (!fromCol || fromCol === toCol) return prev;
      const dragged = map[fromCol].find((i) => i.id === issueId)!;
      const fromItems = map[fromCol].filter((i) => i.id !== issueId);
      const toItems = [...map[toCol], dragged];
      const candidate = { ...map, [fromCol]: fromItems, [toCol]: toItems };
      const fp = fingerprint(candidate);
      const recent = recentLayoutsRef.current;
      if (fp === recent[recent.length - 1]) return prev;
      if (recent.length >= 2 && fp === recent[recent.length - 2]) return prev;
      recentLayoutsRef.current = [...recent.slice(-3), fp];
      return candidate;
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const clear = () => {
      setActiveIssue(null);
      setOverCol(null);
      setMirror(null);
      recentLayoutsRef.current = [];
    };
    if (!over) return clear();

    const issueId = active.id as number;
    const map = mirror ?? cacheCols;
    const finalCol = findFromCol(map, issueId);
    if (!finalCol) return clear();
    const originalCol = findFromCol(cacheCols, issueId);
    if (finalCol === originalCol) return clear(); // no-op

    if (finalCol === BACKLOG_COL) {
      rank.mutate({ id: issueId, clear_sprint: true }, { onSettled: clear });
    } else if (finalCol.startsWith("sprint:")) {
      const sprintId = Number(finalCol.replace("sprint:", ""));
      if (!Number.isNaN(sprintId)) {
        rank.mutate({ id: issueId, sprint_id: sprintId }, { onSettled: clear });
      } else {
        clear();
      }
    } else {
      clear();
    }
  }

  function onDragCancel() {
    setActiveIssue(null);
    setOverCol(null);
    setMirror(null);
    recentLayoutsRef.current = [];
  }

  const allIssueIds = [
    ...liveBacklog.map((i) => i.id),
    ...Array.from(sprintIssues.values()).flatMap((list) => list.map((i) => i.id)),
  ];

  if (!can("issue.view")) {
    return (
      <div className="h-full p-8 overflow-auto flex items-center justify-center">
        <EmptyState icon={defaultIcons.lock} title="No access" description="You don't have permission to view issues in this project." />
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
                onDragCancel={onDragCancel}
              >
                <SortableContext items={allIssueIds} strategy={verticalListSortingStrategy}>
                  <ColumnsContent
                    backlog={liveBacklog}
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
                backlog={liveBacklog}
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
        <EmptyState
          icon={defaultIcons.backlog}
          title="No sprints to plan"
          description={
            <>Create a sprint in the <Link href={`/projects/${id}/sprints`} className="text-brand hover:underline font-medium">Sprints tab</Link> to start planning.</>
          }
          compact
        />
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
      className={`surface-card p-2.5 rounded-lg flex items-start gap-2 text-xs hover:shadow-sm transition-shadow ${
        canDrag ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <span className="font-mono text-[10px] text-muted shrink-0 mt-0.5 w-14 truncate">
        {issue.key ?? `#${issue.id}`}
      </span>
      <span className="flex-1 text-foreground leading-snug truncate">{issue.title}</span>
      <Badge type="priority" value={issue.priority} className="shrink-0" />
    </div>
  );
}
