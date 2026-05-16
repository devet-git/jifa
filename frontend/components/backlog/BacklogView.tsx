"use client";

import { useMemo, useRef, useState } from "react";
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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IssueCard } from "@/components/issues/IssueCard";
import { IssueDragPreview } from "@/components/issues/IssueDragPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useRankIssue } from "@/hooks/useIssues";
import { useDragCursor } from "@/hooks/useDragCursor";
import { BacklogFilterBar } from "@/components/backlog/BacklogFilterBar";
import { Plus } from "lucide-react";
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  // Build the cache view of sections (filtered, sorted) — used as fallback
  // when no drag is in progress.
  const cacheSections: Section[] = useMemo(() => {
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

  // While a drag is in progress, mirror holds the in-flight layout so the UI
  // rearranges instantly. mirror keys = section ids; values = issues in that
  // section's current visual order.
  type SectionsMap = Record<string, Issue[]>;
  const [mirror, setMirror] = useState<SectionsMap | null>(null);

  const cacheSectionsMap = useMemo<SectionsMap>(() => {
    const out: SectionsMap = {};
    for (const s of cacheSections) out[s.id] = s.issues;
    return out;
  }, [cacheSections]);

  const liveSectionsMap = mirror ?? cacheSectionsMap;

  const sections: Section[] = useMemo(
    () =>
      cacheSections.map((s) => ({ ...s, issues: liveSectionsMap[s.id] ?? s.issues })),
    [cacheSections, liveSectionsMap],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  useDragCursor(!!activeIssue);

  function findFromSection(
    map: SectionsMap,
    issueId: number,
  ): string | null {
    for (const [secId, list] of Object.entries(map)) {
      if (list.some((i) => i.id === issueId)) return secId;
    }
    return null;
  }

  // Stringify a section map's id sequence so we can short-circuit setState when
  // an onDragOver tick computes the *same* layout we already have. Without this
  // the layout-shift caused by an update can re-fire onDragOver in the opposite
  // direction (the pointer ends up over a different droppable after the shift),
  // and the two states flip back and forth → "Maximum update depth exceeded".
  function fingerprint(map: SectionsMap): string {
    const keys = Object.keys(map).sort();
    return keys.map((k) => `${k}:${map[k].map((i) => i.id).join(",")}`).join("|");
  }

  function resolveDest(
    overId: string,
    map: SectionsMap,
  ): { sectionId: string; overIssue?: Issue } | null {
    if (map[overId]) return { sectionId: overId };
    const num = Number(overId);
    if (!Number.isFinite(num)) return null;
    for (const [secId, list] of Object.entries(map)) {
      const hit = list.find((i) => i.id === num);
      if (hit) return { sectionId: secId, overIssue: hit };
    }
    return null;
  }

  // Track the last two layouts we've applied so we can detect oscillation —
  // when layout-shift makes the pointer bounce between two droppables and the
  // mirror flip-flops between two states (A → B → A → B → ...).
  const recentLayoutsRef = useRef<string[]>([]);

  function handleDragStart(e: DragStartEvent) {
    const id = Number(e.active.id);
    for (const s of cacheSections) {
      const found = s.issues.find((i) => i.id === id);
      if (found) {
        setActiveIssue(found);
        break;
      }
    }
    recentLayoutsRef.current = [fingerprint(cacheSectionsMap)];
    setMirror(cacheSectionsMap);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const issueId = Number(active.id);
    const overId = String(over.id);
    setMirror((prev) => {
      const map = prev ?? cacheSectionsMap;
      const dest = resolveDest(overId, map);
      if (!dest) return prev;
      const fromSec = findFromSection(map, issueId);
      if (!fromSec) return prev;

      const toSec = dest.sectionId;
      const dragged = map[fromSec].find((i) => i.id === issueId)!;

      let candidate: SectionsMap;
      if (fromSec !== toSec) {
        const fromItems = map[fromSec].filter((i) => i.id !== issueId);
        const toItems = map[toSec].slice();
        const insertIdx = dest.overIssue
          ? toItems.findIndex((i) => i.id === dest.overIssue!.id)
          : toItems.length;
        toItems.splice(insertIdx, 0, dragged);
        candidate = { ...map, [fromSec]: fromItems, [toSec]: toItems };
      } else {
        const list = map[fromSec];
        const fromIdx = list.findIndex((i) => i.id === issueId);
        const toIdx = dest.overIssue
          ? list.findIndex((i) => i.id === dest.overIssue!.id)
          : list.length - 1;
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = list.slice();
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        candidate = { ...map, [fromSec]: next };
      }
      const fp = fingerprint(candidate);
      const recent = recentLayoutsRef.current;
      // Identical to current → no work.
      if (fp === recent[recent.length - 1]) return prev;
      // Identical to the state *before* current → we're oscillating. Ignore.
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

    const activeId = Number(active.id);
    const map = mirror ?? cacheSectionsMap;
    const finalSec = findFromSection(map, activeId);
    if (!finalSec) return clear();

    const fromSec = findFromSection(cacheSectionsMap, activeId);
    const isCrossSection = fromSec !== finalSec;
    const movingToBacklog = finalSec === BACKLOG_SECTION;

    const finalList = map[finalSec];
    const insertedAt = finalList.findIndex((i) => i.id === activeId);
    const beforeIssue = insertedAt > 0 ? finalList[insertedAt - 1] : undefined;
    const afterIssue =
      insertedAt < finalList.length - 1 ? finalList[insertedAt + 1] : undefined;

    // No-op: same section + same slot.
    if (!isCrossSection) {
      const cacheList = cacheSectionsMap[finalSec] ?? [];
      const cacheIdx = cacheList.findIndex((i) => i.id === activeId);
      if (cacheIdx === insertedAt) return clear();
    }

    const destSprintId = cacheSections.find((s) => s.id === finalSec)?.sprintId;

    rank.mutate(
      {
        id: activeId,
        before_id: beforeIssue?.id,
        after_id: afterIssue?.id,
        ...(isCrossSection
          ? movingToBacklog
            ? { clear_sprint: true }
            : { sprint_id: destSprintId }
          : {}),
      },
      { onSettled: clear },
    );
  }

  function handleDragCancel() {
    setActiveIssue(null);
    setMirror(null);
    recentLayoutsRef.current = [];
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
            <Plus className="w-3.5 h-3.5" />
            Sprint
          </Button>
          <Button size="sm" variant="gradient" onClick={onCreateIssue}>
            <Plus className="w-3.5 h-3.5" />
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
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
          {activeIssue && <IssueDragPreview issue={activeIssue} />}
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
                <Checkbox
                  checked={selectedIds.has(issue.id)}
                  onCheckedChange={() => onToggleSelected(issue.id)}
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

  const style = isDragging
    ? { opacity: 0 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} onClick={onClick} dragging={isDragging} draggable />
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
