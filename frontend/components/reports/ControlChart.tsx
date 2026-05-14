"use client";

import { useState } from "react";
import type { ControlChartPoint } from "@/hooks/useReports";

interface Props {
  data: ControlChartPoint[];
}

const W = 720;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

export function ControlChart({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: ControlChartPoint } | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No completed issues with measurable cycle time in the last 180 days.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const sorted = [...data].sort(
    (a, b) => new Date(a.completed_date).getTime() - new Date(b.completed_date).getTime(),
  );

  const minT = new Date(sorted[0].completed_date).getTime();
  const maxT = new Date(sorted[sorted.length - 1].completed_date).getTime();
  const span = Math.max(1, maxT - minT);
  const maxY = niceCeil(Math.max(...sorted.map((d) => d.cycle_days)));

  const xScale = (t: number) => ((t - minT) / span) * innerW;
  const yScale = (d: number) => innerH - (d / maxY) * innerH;

  const avg = sorted.reduce((s, d) => s + d.cycle_days, 0) / sorted.length;

  // Monthly tick labels on x-axis
  const monthTicks: { x: number; label: string }[] = [];
  const startDate = new Date(minT);
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cur.getTime() <= maxT) {
    const t = cur.getTime();
    if (t >= minT) {
      monthTicks.push({
        x: xScale(t),
        label: cur.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto text-gray-600"
        role="img"
        onMouseLeave={() => setTooltip(null)}
      >
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Y grid + labels */}
          {yTicks(maxY).map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke="#e5e7eb" strokeDasharray={t === 0 ? "" : "2 3"} />
              <text x={-6} y={yScale(t)} fontSize={10} textAnchor="end" dominantBaseline="middle" fill="currentColor">
                {t}d
              </text>
            </g>
          ))}

          {/* Average line */}
          <line
            x1={0} x2={innerW}
            y1={yScale(avg)} y2={yScale(avg)}
            stroke="#6366f1" strokeDasharray="5 3" strokeWidth={1.5}
          />
          <text x={innerW - 4} y={yScale(avg) - 5} fontSize={10} textAnchor="end" fill="#6366f1">
            avg {avg.toFixed(1)}d
          </text>

          {/* X-axis month labels */}
          {monthTicks.map((tick) => (
            <text key={tick.label} x={tick.x} y={innerH + 16} fontSize={9} textAnchor="middle" fill="currentColor">
              {tick.label}
            </text>
          ))}

          {/* Data points */}
          {sorted.map((d) => {
            const cx = xScale(new Date(d.completed_date).getTime());
            const cy = yScale(d.cycle_days);
            return (
              <circle
                key={d.issue_id}
                cx={cx} cy={cy} r={5}
                fill={d.cycle_days > avg * 2 ? "#f59e0b" : "#3b82f6"}
                opacity={0.75}
                className="cursor-pointer"
                onMouseEnter={() => setTooltip({ x: cx, y: cy, point: d })}
              />
            );
          })}
        </g>
      </svg>

      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-surface-elevated border border-border rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: `${((tooltip.x + PAD.left) / W) * 100}%`,
            top: `${((tooltip.y + PAD.top) / H) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <p className="font-semibold text-foreground">{tooltip.point.key}</p>
          <p className="text-muted truncate max-w-[200px]">{tooltip.point.title}</p>
          <p className="text-brand mt-1">{tooltip.point.cycle_days.toFixed(1)} days</p>
          <p className="text-muted">{tooltip.point.completed_date}</p>
        </div>
      )}
    </div>
  );
}

function niceCeil(n: number) {
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / step) * step;
}

function yTicks(max: number) {
  const out: number[] = [];
  const step = max <= 10 ? Math.max(1, Math.round(max / 5)) : Math.round(max / 5);
  for (let v = 0; v <= max + 0.001; v += step) out.push(Math.round(v));
  return out;
}
