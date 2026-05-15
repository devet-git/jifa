import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableIssueCard } from "./SortableIssueCard";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Issue, StatusDefinition } from "@/types";

interface Props {
  status: StatusDefinition;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  boardKey?: string;
  selectMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onQuickAdd?: (statusKey: string, title: string) => void;
}

export function KanbanColumn({ status, issues, onIssueClick, boardKey = "default", selectMode, selectedIds, onToggleSelect, onQuickAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key });
  const accent = status.color || "#94a3b8";
  const storageKey = `kanban-col-collapsed:${boardKey}:${status.key}`;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(window.localStorage.getItem(storageKey) === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        if (next) window.localStorage.setItem(storageKey, "1");
        else window.localStorage.removeItem(storageKey);
      }
      return next;
    });
  }

  return (
    <div
      className={
        "flex flex-col surface-card shrink-0 overflow-hidden transition-[width] max-h-full min-h-[300px] " +
        (collapsed ? "w-12 min-w-[3rem]" : "w-72 min-w-[280px]")
      }
    >
      <div
        aria-hidden
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 40%, transparent) 100%)`,
        }}
      />
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          title={`Expand ${status.name}`}
          className="flex-1 flex flex-col items-center gap-2 py-3 hover:bg-surface-2 transition"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-[11px] font-semibold bg-surface-2 text-muted rounded-full px-1.5 py-0.5 tabular-nums">
            {issues.length}
          </span>
          <span
            className="text-[11px] font-semibold text-muted whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {status.name}
          </span>
        </button>
      ) : (
        <>
          <div className="px-4 py-3 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: accent }}
            />
            <h3 className="font-semibold text-sm truncate flex-1">{status.name}</h3>
            <span className="text-[11px] font-medium bg-surface-2 text-muted rounded-full px-2 py-0.5 min-w-[22px] text-center">
              {issues.length}
            </span>
            {selectMode && (
              <Checkbox
                title="Select all in column"
                checked={
                  issues.length > 0 &&
                  issues.every((i) => selectedIds?.has(i.id))
                }
                onCheckedChange={() => {
                  const allSelected =
                    issues.length > 0 &&
                    issues.every((i) => selectedIds?.has(i.id));
                  issues.forEach((i) => {
                    const isSelected = selectedIds?.has(i.id) ?? false;
                    if (allSelected ? isSelected : !isSelected)
                      onToggleSelect?.(i.id);
                  });
                }}
              />
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label={`Collapse ${status.name}`}
              title="Collapse column"
              className="w-5 h-5 -mr-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>
          <div
            ref={setNodeRef}
            className={`flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-2 rounded-b-xl transition ${
              isOver ? "bg-brand-soft" : ""
            }`}
          >
            <SortableContext
              items={issues.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {issues.map((issue) => (
                <SortableIssueCard
                  key={issue.id}
                  issue={issue}
                  onClick={() => onIssueClick(issue)}
                  selectMode={selectMode}
                  selected={selectedIds?.has(issue.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </SortableContext>
            {issues.length === 0 && !isOver && (
              <p className="text-[11px] text-muted text-center py-6 italic">
                Drag issues here
              </p>
            )}
            {!selectMode && (
              <QuickAddRow statusKey={status.key} onAdd={onQuickAdd} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuickAddRow({
  statusKey,
  onAdd,
}: {
  statusKey: string;
  onAdd?: (statusKey: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function submit() {
    const t = title.trim();
    if (!t) return;
    onAdd?.(statusKey, t);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-1 text-xs text-muted hover:text-foreground hover:bg-surface-2 rounded-lg px-2 py-1.5 transition mt-1"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add issue
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1.5">
      <input
        autoFocus
        type="text"
        placeholder="Issue title…"
        className="input !py-1.5 !text-xs w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setOpen(false); setTitle(""); }
        }}
      />
      <div className="flex gap-1">
        <button
          onClick={submit}
          className="text-xs gradient-brand text-white rounded-md px-2.5 py-1 font-medium"
        >
          Add
        </button>
        <button
          onClick={() => { setOpen(false); setTitle(""); }}
          className="text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
