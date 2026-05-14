"use client";

import type { WorkloadEntry } from "@/hooks/useReports";

interface Props {
  data: WorkloadEntry[];
}

export function WorkloadChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-10 italic">
        No issues to report on yet.
      </p>
    );
  }

  // Scale bars to the largest active workload so relative differences read at
  // a glance. Active = open + in-progress (the work actually queued up).
  const maxActive = Math.max(
    1,
    ...data.map((d) => d.open_count + d.in_progress_count),
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 text-[11px] font-medium text-muted uppercase tracking-wider px-2">
        <span>Assignee</span>
        <span className="text-right w-14">Open</span>
        <span className="text-right w-14">In prog</span>
        <span className="text-right w-14">Done</span>
        <span className="text-right w-16">Points</span>
      </div>
      {data.map((row) => {
        const active = row.open_count + row.in_progress_count;
        const openPct = (row.open_count / maxActive) * 100;
        const inProgPct = (row.in_progress_count / maxActive) * 100;
        return (
          <div
            key={row.user_id ?? `unassigned-${row.user_name}`}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-2 py-2 hover:bg-surface-2 rounded-md transition"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{row.user_name}</p>
              <div className="mt-1.5 flex h-2 rounded-full bg-surface-2 overflow-hidden ring-1 ring-border">
                <div
                  className="bg-amber-400"
                  style={{ width: `${openPct}%` }}
                  title={`Open: ${row.open_count}`}
                />
                <div
                  className="bg-indigo-500"
                  style={{ width: `${inProgPct}%` }}
                  title={`In progress: ${row.in_progress_count}`}
                />
              </div>
              <p className="text-[11px] text-muted mt-1 tabular-nums">
                {active} active · {row.total_count} total
              </p>
            </div>
            <span className="text-sm tabular-nums text-right w-14">
              {row.open_count}
            </span>
            <span className="text-sm tabular-nums text-right w-14">
              {row.in_progress_count}
            </span>
            <span className="text-sm tabular-nums text-right w-14 text-muted">
              {row.done_count}
            </span>
            <span className="text-sm tabular-nums text-right w-16 font-semibold">
              {row.open_points + row.in_progress_points}
              <span className="text-[10px] text-muted ml-0.5">SP</span>
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-[11px] text-muted pt-2 border-t border-border">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          In progress
        </span>
        <span className="ml-auto italic">Points column shows active (open + in-progress) story points.</span>
      </div>
    </div>
  );
}
