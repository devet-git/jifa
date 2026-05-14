"use client";

import type { TimeInStatusEntry } from "@/hooks/useReports";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ec4899", "#8b5cf6", "#ef4444", "#84cc16",
];

function fmt(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

interface Props {
  data: TimeInStatusEntry[];
}

export function TimeInStatusChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-sm text-muted text-center py-8">No data yet.</p>;
  }

  const max = Math.max(1, ...data.map((e) => e.avg_hours));

  return (
    <div className="space-y-3">
      {data.map((e, i) => (
        <div key={e.status_key} className="flex items-center gap-3">
          <span className="text-sm font-medium w-28 shrink-0 truncate">{e.status_name}</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-5 rounded bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(e.avg_hours / max) * 100}%`,
                  background: COLORS[i % COLORS.length],
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted w-12 text-right">{fmt(e.avg_hours)}</span>
          </div>
          <span className="text-[11px] text-muted w-16 text-right">{e.count} issues</span>
        </div>
      ))}
    </div>
  );
}
