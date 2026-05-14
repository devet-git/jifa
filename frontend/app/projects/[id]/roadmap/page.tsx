"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/useProject";
import { useIssues } from "@/hooks/useIssues";
import { IssueDetail } from "@/components/issues/IssueDetail";
import type { Issue } from "@/types";

const DAY_PX = 20;
const ROW_H = 32;
const HEADER_H = 40;
const LABEL_W = 220;

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { data: issues = [] } = useIssues({ project_id: id });
  const [selected, setSelected] = useState<Issue | null>(null);

  const epics = useMemo(
    () => issues.filter((i) => i.type === "epic"),
    [issues],
  );

  // Each epic carries its children with it.
  const rows = useMemo(() => {
    return epics.map((epic) => {
      const children = issues.filter((i) => i.parent_id === epic.id);
      return { epic, children };
    });
  }, [issues, epics]);

  // Date range to cover. Default: today - 7 to today + 60. Expand to cover
  // any epic or child that pokes outside.
  const { rangeStart, rangeEnd, days } = useMemo(() => {
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
  const totalRows = rows.reduce(
    (n, r) => n + 1 + r.children.length,
    0,
  );
  const totalH = HEADER_H + totalRows * ROW_H;

  function xForDate(d?: string | Date | null) {
    if (!d) return null;
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = Math.floor(
      (startOfDay(date).getTime() - rangeStart.getTime()) / 86_400_000,
    );
    return diff * DAY_PX;
  }

  // Month markers across the header.
  const monthMarkers = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    let lastMonth = -1;
    days.forEach((d, i) => {
      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        out.push({
          x: i * DAY_PX,
          label: d.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
        });
      }
    });
    return out;
  }, [days]);

  const todayX = xForDate(new Date());

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-7 pb-4 border-b border-border bg-surface">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand transition mb-2"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {project?.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
        <p className="text-xs text-muted mt-1">
          Set <b className="text-foreground">start date</b> và{" "}
          <b className="text-foreground">due date</b> trên epic để hiển thị tại đây.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {epics.length === 0 ? (
          <div className="surface-card p-12 text-center max-w-xl mx-auto mt-12">
            <div className="mx-auto w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No epics yet</p>
            <p className="text-sm text-muted">Tạo một epic để bắt đầu roadmap.</p>
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
                    <span className="text-sm font-medium truncate">
                      {epic.title}
                    </span>
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
                      <span className="text-xs truncate text-foreground">
                        {ch.title}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="relative">
              <svg
                width={totalW}
                height={totalH}
                style={{ display: "block" }}
              >
                {/* Header */}
                <rect
                  x={0}
                  y={0}
                  width={totalW}
                  height={HEADER_H}
                  fill="#f9fafb"
                />
                {monthMarkers.map((m) => (
                  <g key={m.x}>
                    <line
                      x1={m.x}
                      x2={m.x}
                      y1={0}
                      y2={totalH}
                      stroke="#e5e7eb"
                    />
                    <text
                      x={m.x + 6}
                      y={24}
                      fontSize={11}
                      fill="#4b5563"
                    >
                      {m.label}
                    </text>
                  </g>
                ))}

                {/* Today line */}
                {todayX !== null && (
                  <line
                    x1={todayX}
                    x2={todayX}
                    y1={0}
                    y2={totalH}
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Row backgrounds + bars */}
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
      </div>

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
}: {
  issue: Issue;
  y: number;
  xForDate: (d?: string | Date | null) => number | null;
  totalW: number;
  isEpic?: boolean;
}) {
  const sx = xForDate(issue.start_date);
  const ex = xForDate(issue.due_date);
  const fill = isEpic
    ? issue.color || "#94a3b8"
    : statusColor(issue.status);

  // Row separator
  const sep = (
    <line
      x1={0}
      x2={totalW}
      y1={y + ROW_H}
      y2={y + ROW_H}
      stroke="#f3f4f6"
    />
  );

  if (sx === null && ex === null) return sep;

  let x1 = sx ?? ex!;
  let x2 = ex ?? (sx! + 14 * DAY_PX);
  if (x2 < x1) [x1, x2] = [x2, x1];
  const width = Math.max(8, x2 - x1 + DAY_PX);

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
          {issue.title}{" "}
          {issue.start_date ? ` (${issue.start_date.slice(0, 10)}` : ""}
          {issue.start_date && issue.due_date ? " → " : ""}
          {issue.due_date ? `${issue.due_date.slice(0, 10)})` : ""}
        </title>
      </rect>
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
