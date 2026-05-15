"use client";

import { useCallback, useMemo, useState, use } from "react";
import Link from "next/link";
import { BulkActionBar } from "@/components/backlog/BulkActionBar";
import { useSprints } from "@/hooks/useSprints";
import { useProject } from "@/hooks/useProject";
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
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { IssueCard } from "@/components/issues/IssueCard";
import { IssueDetail } from "@/components/issues/IssueDetail";
import {
  useIssues,
  useCreateIssue,
  useRankIssue,
  useUpdateIssueStatus,
} from "@/hooks/useIssues";
import { useStatuses } from "@/hooks/useStatuses";
import { ArrowLeft, Columns2 } from "lucide-react";
import { ProjectFormatProvider } from "@/lib/projectFormat";
import type { Issue } from "@/types";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: issues = [] } = useIssues({ sprint_id: id });
  const updateStatus = useUpdateIssueStatus();
  const rank = useRankIssue();
  const createIssue = useCreateIssue();

  // Project id is derived from the issues so we can fetch this sprint's
  // workflow without an extra round-trip.
  const projectId = issues[0]?.project_id;
  const { data: statuses = [] } = useStatuses(projectId ?? 0);
  const { data: sprints = [] } = useSprints(projectId ?? 0);
  const { data: project } = useProject(projectId ?? 0);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(() => {
    const byStatus: Record<string, Issue[]> = {};
    for (const s of statuses) byStatus[s.key] = [];
    // Tolerate issues with stale status keys (e.g. status was renamed in
    // another tab) by pushing them into a fallback bucket keyed on their own
    // status string.
    for (const i of issues) {
      if (!byStatus[i.status]) byStatus[i.status] = [];
      byStatus[i.status].push(i);
    }
    for (const key of Object.keys(byStatus)) {
      byStatus[key].sort((a, b) => {
        const ar = a.rank ?? Number.MAX_SAFE_INTEGER;
        const br = b.rank ?? Number.MAX_SAFE_INTEGER;
        return ar !== br ? ar - br : a.id - b.id;
      });
    }
    return byStatus;
  }, [issues, statuses]);

  function handleDragStart(e: DragStartEvent) {
    const issue = issues.find((i) => i.id === Number(e.active.id));
    setActiveIssue(issue ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) { setActiveIssue(null); return; }

    const issueId = Number(active.id);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) { setActiveIssue(null); return; }

    const overId = String(over.id);
    const statusKeys = new Set(statuses.map((s) => s.key));
    let toStatus: string;
    let beforeId: number | undefined;
    let afterId: number | undefined;

    if (statusKeys.has(overId)) {
      toStatus = overId;
      const colIssues = (columns[toStatus] ?? []).filter(
        (i) => i.id !== issueId,
      );
      beforeId = colIssues[colIssues.length - 1]?.id;
      afterId = undefined;
    } else {
      const overIssue = issues.find((i) => i.id === Number(overId));
      if (!overIssue) { setActiveIssue(null); return; }
      toStatus = overIssue.status;
      const colIssues = (columns[toStatus] ?? []).filter(
        (i) => i.id !== issueId,
      );
      const idx = colIssues.findIndex((i) => i.id === overIssue.id);
      beforeId = colIssues[idx - 1]?.id;
      afterId = colIssues[idx]?.id;
    }

    const movedColumn = issue.status !== toStatus;
    const promises: Promise<unknown>[] = [];
    if (movedColumn) {
      promises.push(updateStatus.mutateAsync({ id: issueId, status: toStatus }));
    }
    promises.push(rank.mutateAsync({ id: issueId, before_id: beforeId, after_id: afterId }));

    Promise.all(promises).finally(() => setActiveIssue(null));
  }

  const totalIssues = issues.length;

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div className="px-8 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2 mb-2">
          {projectId && (
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {project?.name ?? "Back to project"}
            </Link>
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2 mr-4">
            <Columns2 className="w-6 h-6 text-brand" />
            Sprint Board
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {totalIssues} issue{totalIssues === 1 ? "" : "s"} · {statuses.length} columns
          </p>
        </div>
        <button
          onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
          className={`text-sm px-3 py-1.5 rounded-lg ring-1 transition font-medium ${
            selectMode
              ? "bg-brand-soft text-brand-strong ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
              : "ring-border text-muted hover:text-foreground hover:bg-surface-2"
          }`}
        >
          {selectMode ? `${selectedIds.size} selected` : "Select"}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {statuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                issues={columns[status.key] ?? []}
                onIssueClick={selectMode ? () => {} : setSelectedIssue}
                boardKey={`sprint-${id}`}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onQuickAdd={(statusKey, title) => {
                  if (!projectId) return;
                  createIssue.mutate({ title, status: statusKey as import("@/types").IssueStatus, project_id: projectId, sprint_id: Number(id) });
                }}
              />
            ))}
            {statuses.length === 0 && (
              <div className="m-auto text-center">
                <div className="mx-auto w-10 h-10 rounded-full skeleton mb-3" />
                <p className="text-sm text-muted">Loading workflow…</p>
              </div>
            )}
          </div>
          <DragOverlay>
            {activeIssue && <IssueCard issue={activeIssue} dragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          sprints={sprints}
          onClear={() => { setSelectedIds(new Set()); setSelectMode(false); }}
        />
      )}

      {selectedIssue && (
        <ProjectFormatProvider dateFormat={project?.date_format} timeFormat={project?.time_format}>
          <IssueDetail
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
          />
        </ProjectFormatProvider>
      )}
      </div>
    </div>
  );
}
