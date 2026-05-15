"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIssues, useUpdateIssue } from "@/hooks/useIssues";
import { usePermissionsStore } from "@/store/permissions";
import { IssueDetail } from "@/components/issues/IssueDetail";
import type { Issue } from "@/types";

const DAY_PX = 20;
const ROW_H = 32;
const HEADER_H = 40;
const LABEL_W = 220;
const HANDLE_W = 8;

type DragState = {
  id: number;
  origX2: number;
  startClientX: number;
  currentX2: number;
};

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const { data: issues = [] } = useIssues({ project_id: id });
  const [selected, setSelected] = useState<Issue | null>(null);
  const updateIssue = useUpdateIssue();
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const canEditIssue = can("issue.edit");

  const epics = useMemo(
    () => issues.filter((i) => i.type === "epic"),
    [issues],
  );

  const rows = useMemo(() => {
    return epics.map((epic) => {
      const children = issues.filter((i) => i.parent_id === epic.id);
      return { epic, children };
    });
  }, [issues, epics]);

  const { rangeStart, days } = useMemo(() => {
    const today = startOfDay(new Date());
    let start = addDays(today, -7);
    let end = addDays(today, 60);
    for (const { epic, children } of rows) {
      for (const i of [epic, ...children]) {
        const s = parseDate(i.start_date) ?? parseDate(i.due_date);
        const e = parseDate(i.due_date) ?? parseDate(i.start_date);
        if (s && s < start) start = startOfDay(s);
        if (e && e > end) end = startOfDay(e);
      }
    }
    const arr: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) arr.push(d);
    return { rangeStart: start, rangeEnd: end, days: arr };
  }, [rows]);

  const totalW = days.length * DAY_PX;
  const totalRows = rows.reduce((n, r) => n + 1 + r.children.length, 0);
  const totalH = HEADER_H + totalRows * ROW_H;

  function xForDate(d?: string | Date | null) {
    if (!d) return null;
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = Math.floor(
      (startOfDay(date).getTime() - rangeStart.getTime()) / 86_400_000,
    );
    return diff * DAY_PX;
  }

  const monthMarkers = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    let lastMonth = -1;
    days.forEach((d, i) => {
      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        out.push({
          x: i * DAY_PX,
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        });
      }
    });
    return out;
  }, [days]);

  const todayX = xForDate(new Date());

  const handleResizeStart = useCallback(
    (issueId: number, origX2: number, clientX: number) => {
      setDrag({ id: issueId, origX2, startClientX: clientX, currentX2: origX2 });
    },
    [],
  );

  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const delta = e.clientX - d.startClientX;
      const rawX2 = d.origX2 + delta;
      const snapped = Math.round(rawX2 / DAY_PX) * DAY_PX;
      setDrag((prev) => prev ? { ...prev, currentX2: snapped } : null);
    }
    function onUp() {
      const d = dragRef.current;
      if (!d) return;
      const days = Math.round(d.currentX2 / DAY_PX);
      const newDueDate = addDays(rangeStart, days);
      const iso = `${fmtDate(newDueDate)}T00:00:00Z`;
      updateIssue.mutate({ id: d.id, due_date: iso } as { id: number; due_date: string });
      setDrag(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, rangeStart, updateIssue]);

  return (
    <div className="h-full overflow-auto" style={drag ? { userSelect: "none", cursor: "ew-resize" } : undefined}>
        {epics.length === 0 ? (
          <div className="surface-card p-12 text-center max-w-xl mx-auto mt-12">
            <div className="mx-auto w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No epics yet</p>
            <p className="text-sm text-muted">Create an epic to start your roadmap.</p>
          </div>
        ) : (
          <div className="flex">
            {/* Left label column */}
            <div
              className="bg-surface border-r border-border"
              style={{ width: LABEL_W, flexShrink: 0 }}
            >
              <div
                className="border-b border-border bg-surface-2/60"
                style={{ height: HEADER_H }}
              />
              {rows.map(({ epic, children }) => (
                <div key={epic.id}>
                  <button
                    onClick={() => setSelected(epic)}
                    className="w-full text-left px-3 flex items-center gap-2 hover:bg-surface-2 transition"
                    style={{ height: ROW_H }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-surface"
                      style={{ backgroundColor: epic.color || "#94a3b8" }}
                    />
                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {epic.key ?? `#${epic.id}`}
                    </span>
                    <span className="text-sm font-medium truncate">{epic.title}</span>
                  </button>
                  {children.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelected(ch)}
                      className="w-full text-left pl-8 pr-3 flex items-center gap-2 hover:bg-surface-2 transition"
                      style={{ height: ROW_H }}
                    >
                      <span className="text-[11px] font-mono text-muted shrink-0">
                        {ch.key ?? `#${ch.id}`}
                      </span>
                      <span className="text-xs truncate text-foreground">{ch.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="relative overflow-x-auto">
              <svg width={totalW} height={totalH} style={{ display: "block" }}>
                {/* Header */}
                <rect x={0} y={0} width={totalW} height={HEADER_H} fill="#f9fafb" />
                {monthMarkers.map((m) => (
                  <g key={m.x}>
                    <line x1={m.x} x2={m.x} y1={0} y2={totalH} stroke="#e5e7eb" />
                    <text x={m.x + 6} y={24} fontSize={11} fill="#4b5563">
                      {m.label}
                    </text>
                  </g>
                ))}

                {todayX !== null && (
                  <line
                    x1={todayX} x2={todayX} y1={0} y2={totalH}
                    stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3"
                  />
                )}

                {(() => {
                  let row = 0;
                  const nodes: React.ReactNode[] = [];
                  for (const { epic, children } of rows) {
                    const y = HEADER_H + row * ROW_H;
                    nodes.push(
                      <BarRow
                        key={`epic-${epic.id}`}
                        issue={epic}
                        y={y}
                        xForDate={xForDate}
                        totalW={totalW}
                        isEpic
                        canEditIssue={canEditIssue}
                        dragX2={drag?.id === epic.id ? drag.currentX2 : undefined}
                        onResizeStart={handleResizeStart}
                      />,
                    );
                    row++;
                    for (const ch of children) {
                      const cy = HEADER_H + row * ROW_H;
                      nodes.push(
                        <BarRow
                          key={`child-${ch.id}`}
                          issue={ch}
                          y={cy}
                          xForDate={xForDate}
                          totalW={totalW}
                          canEditIssue={canEditIssue}
                          dragX2={drag?.id === ch.id ? drag.currentX2 : undefined}
                          onResizeStart={handleResizeStart}
                        />,
                      );
                      row++;
                    }
                  }
                  return nodes;
                })()}
              </svg>
            </div>
          </div>
        )}

        {selected && (
          <IssueDetail issue={selected} onClose={() => setSelected(null)} />
        )}
    </div>
  );
}

function BarRow({
  issue,
  y,
  xForDate,
  totalW,
  isEpic,
  canEditIssue,
  dragX2,
  onResizeStart,
}: {
  issue: Issue;
  y: number;
  xForDate: (d?: string | Date | null) => number | null;
  totalW: number;
  isEpic?: boolean;
  canEditIssue?: boolean;
  dragX2?: number;
  onResizeStart: (id: number, origX2: number, clientX: number) => void;
}) {
  const sx = xForDate(issue.start_date);
  const ex = xForDate(issue.due_date);
  const fill = isEpic ? issue.color || "#94a3b8" : statusColor(issue.status);

  const sep = (
    <line x1={0} x2={totalW} y1={y + ROW_H} y2={y + ROW_H} stroke="#f3f4f6" />
  );

  if (sx === null && ex === null) return sep;

  let x1 = sx ?? ex!;
  let x2 = ex ?? (sx! + 14 * DAY_PX);
  if (x2 < x1) [x1, x2] = [x2, x1];

  const barX2 = dragX2 !== undefined ? Math.max(x1 + DAY_PX, dragX2) : x2 + DAY_PX;
  const width = Math.max(8, barX2 - x1);

  return (
    <g>
      {sep}
      <rect
        x={x1}
        y={y + 6}
        width={width}
        height={ROW_H - 12}
        rx={4}
        fill={fill}
        opacity={isEpic ? 0.85 : 0.7}
      >
        <title>
          {issue.title}
          {issue.start_date ? ` (${issue.start_date.slice(0, 10)}` : ""}
          {issue.start_date && issue.due_date ? " → " : ""}
          {issue.due_date ? `${issue.due_date.slice(0, 10)})` : ""}
        </title>
      </rect>
      {canEditIssue && (
        <>
          {/* Resize handle — right edge */}
          <rect
            x={x1 + width - HANDLE_W}
            y={y + 4}
            width={HANDLE_W}
            height={ROW_H - 8}
            rx={2}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(issue.id, x2 + DAY_PX, e.clientX);
            }}
          />
          {/* Resize grip dots */}
          <line
            x1={x1 + width - 3}
            x2={x1 + width - 3}
            y1={y + ROW_H / 2 - 4}
            y2={y + ROW_H / 2 + 4}
            stroke="white"
            strokeWidth={1.5}
            strokeOpacity={0.7}
            style={{ pointerEvents: "none" }}
          />
          <line
            x1={x1 + width - 6}
            x2={x1 + width - 6}
            y1={y + ROW_H / 2 - 4}
            y2={y + ROW_H / 2 + 4}
            stroke="white"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            style={{ pointerEvents: "none" }}
          />
        </>
      )}
    </g>
  );
}

function statusColor(s: string) {
  return (
    {
      todo: "#d1d5db",
      in_progress: "#60a5fa",
      in_review: "#fbbf24",
      done: "#34d399",
    }[s] ?? "#d1d5db"
  );
}

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
