"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IssueCard } from "@/components/issues/IssueCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRankIssue } from "@/hooks/useIssues";
import { BacklogFilterBar } from "@/components/backlog/BacklogFilterBar";
import { BulkActionBar } from "@/components/backlog/BulkActionBar";
import type { BacklogFilterState, Issue, Sprint } from "@/types";

interface Props {
  projectId: string;
  sprints: Sprint[];
  backlog: Issue[];
  onCreateIssue: () => void;
  onCreateSprint: () => void;
  onIssueClick: (issue: Issue) => void;
}

type Section = {
  id: string; // "sprint:42" | "backlog"
  title: string;
  subtitle?: string;
  status?: Sprint["status"];
  sprintId?: number;
  issues: Issue[];
};

const BACKLOG_SECTION = "backlog";

export function BacklogView({
  projectId,
  sprints,
  backlog,
  onCreateIssue,
  onCreateSprint,
  onIssueClick,
}: Props) {
  const rank = useRankIssue();
  const [filters, setFilters] = useState<BacklogFilterState>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  // Build sections in deterministic order: active sprints, then planned,
  // then backlog. Completed sprints are hidden from this view (Jira-like).
  const sections: Section[] = useMemo(() => {
    const visible = sprints.filter((s) => s.status !== "completed");
    const ordered = [
      ...visible.filter((s) => s.status === "active"),
      ...visible.filter((s) => s.status === "planned"),
    ];
    const apply = (list: Issue[]) => list.filter((i) => matchesFilter(i, filters));
    const sprintSections: Section[] = ordered.map((s) => ({
      id: `sprint:${s.id}`,
      title: s.name,
      subtitle: s.goal,
      status: s.status,
      sprintId: s.id,
      issues: apply(s.issues ?? []).slice().sort((a, b) => rankCmp(a, b)),
    }));
    return [
      ...sprintSections,
      {
        id: BACKLOG_SECTION,
        title: "Backlog",
        issues: apply(backlog).slice().sort(rankCmp),
      },
    ];
  }, [sprints, backlog, filters]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // Flat index of issue id -> section id, for figuring out source.
  const issueToSection = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of sections) for (const i of s.issues) m.set(i.id, s.id);
    return m;
  }, [sections]);

  function handleDragStart(e: DragStartEvent) {
    const id = Number(e.active.id);
    for (const s of sections) {
      const found = s.issues.find((i) => i.id === id);
      if (found) {
        setActiveIssue(found);
        return;
      }
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = Number(active.id);
    const fromSectionId = issueToSection.get(activeId);
    if (!fromSectionId) return;

    // over.id can be an issue id (drop on a card) or a section id (drop on
    // section container).
    let toSectionId: string;
    let toIndex: number;
    const overIsSection = sections.some((s) => s.id === String(over.id));
    if (overIsSection) {
      toSectionId = String(over.id);
      toIndex = sections.find((s) => s.id === toSectionId)!.issues.length;
    } else {
      const overId = Number(over.id);
      const targetSection = sections.find((s) =>
        s.issues.some((i) => i.id === overId),
      );
      if (!targetSection) return;
      toSectionId = targetSection.id;
      toIndex = targetSection.issues.findIndex((i) => i.id === overId);
    }

    const dest = sections.find((s) => s.id === toSectionId)!;
    const destIssues = dest.issues.filter((i) => i.id !== activeId);
    const beforeIssue = destIssues[toIndex - 1];
    const afterIssue = destIssues[toIndex];

    const isCrossSection = fromSectionId !== toSectionId;
    const movingToBacklog = toSectionId === BACKLOG_SECTION;

    // Don't fire a no-op move within the same section.
    if (!isCrossSection) {
      const fromIndex = dest.issues.findIndex((i) => i.id === activeId);
      if (fromIndex === toIndex) return;
    }

    rank.mutate({
      id: activeId,
      before_id: beforeIssue?.id,
      after_id: afterIssue?.id,
      ...(isCrossSection
        ? movingToBacklog
          ? { clear_sprint: true }
          : { sprint_id: dest.sprintId }
        : {}),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Backlog</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectMode ? "primary" : "ghost"}
            onClick={() => {
              setSelectMode((v) => !v);
              if (selectMode) setSelected(new Set());
            }}
          >
            {selectMode ? "Done" : "Select"}
          </Button>
          <Button size="sm" variant="secondary" onClick={onCreateSprint}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Sprint
          </Button>
          <Button size="sm" variant="gradient" onClick={onCreateIssue}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Issue
          </Button>
        </div>
      </div>

      <BacklogFilterBar
        projectId={projectId}
        value={filters}
        onChange={setFilters}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              onIssueClick={onIssueClick}
              selectMode={selectMode}
              selectedIds={selected}
              onToggleSelected={toggleSelected}
            />
          ))}
        </div>
        <DragOverlay>
          {activeIssue && <IssueCard issue={activeIssue} dragging />}
        </DragOverlay>
      </DndContext>

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selected)}
          sprints={sprints}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}

function SectionBlock({
  section,
  onIssueClick,
  selectMode,
  selectedIds,
  onToggleSelected,
}: {
  section: Section;
  onIssueClick: (i: Issue) => void;
  selectMode: boolean;
  selectedIds: Set<number>;
  onToggleSelected: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-2/60 flex items-center gap-2">
        <span className="font-semibold text-sm">{section.title}</span>
        {section.status && <Badge type="sprint" value={section.status} />}
        <span className="text-[11px] font-medium bg-surface text-muted rounded-full px-2 py-0.5 ring-1 ring-border">
          {section.issues.length}
        </span>
        {section.subtitle && (
          <span className="text-xs text-muted italic truncate">
            — {section.subtitle}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`p-3 space-y-2 min-h-[60px] transition ${
          isOver ? "bg-brand-soft" : ""
        }`}
      >
        <SortableContext
          items={section.issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {section.issues.map((issue) =>
            selectMode ? (
              <div key={issue.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(issue.id)}
                  onChange={() => onToggleSelected(issue.id)}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <IssueCard
                    issue={issue}
                    onClick={() => onToggleSelected(issue.id)}
                  />
                </div>
              </div>
            ) : (
              <SortableIssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue)}
              />
            ),
          )}
        </SortableContext>
        {section.issues.length === 0 && (
          <p className="text-xs text-muted text-center py-5 italic">
            Drag issues here
          </p>
        )}
      </div>
    </div>
  );
}

function SortableIssueRow({
  issue,
  onClick,
}: {
  issue: Issue;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <IssueCard issue={issue} onClick={onClick} dragging={isDragging} />
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
    if (!i.assignee_id || !f.assignee_ids.includes(i.assignee_id))
      return false;
  }
  if (f.types?.length && !f.types.includes(i.type)) return false;
  if (f.priorities?.length && !f.priorities.includes(i.priority)) return false;
  if (f.label_ids?.length) {
    const issueLabelIds = (i.labels ?? []).map((l) => l.id);
    if (!f.label_ids.some((id) => issueLabelIds.includes(id))) return false;
  }
  return true;
}

function rankCmp(a: Issue, b: Issue) {
  const ar = a.rank ?? Number.MAX_SAFE_INTEGER;
  const br = b.rank ?? Number.MAX_SAFE_INTEGER;
  if (ar !== br) return ar - br;
  return a.id - b.id;
}
