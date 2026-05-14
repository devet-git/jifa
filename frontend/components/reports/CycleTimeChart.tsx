"use client";

import type { CycleEntry } from "@/hooks/useReports";

interface Props {
  data: CycleEntry[];
}

const W = 720;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

export function CycleTimeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No measurable cycles in the last 90 days. Move some issues through
        in-progress → done to see data.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const sorted = [...data].sort(
    (a, b) =>
      new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime(),
  );
  const minT = new Date(sorted[0].completed_at).getTime();
  const maxT = new Date(sorted[sorted.length - 1].completed_at).getTime();
  const span = Math.max(1, maxT - minT);
  const maxY = niceCeil(Math.max(...sorted.map((d) => d.cycle_hours)));
  const xScale = (t: number) => ((t - minT) / span) * innerW;
  const yScale = (h: number) => innerH - (h / maxY) * innerH;

  // 50th and 90th percentile reference lines.
  const sortedHours = [...sorted.map((d) => d.cycle_hours)].sort((a, b) => a - b);
  const p50 = sortedHours[Math.floor(sortedHours.length * 0.5)];
  const p90 = sortedHours[Math.floor(sortedHours.length * 0.9)];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-gray-600"
      role="img"
    >
      <g transform={`translate(${PAD.left}, ${PAD.top})`}>
        {ticks(maxY).map((t) => (
          <g key={t}>
            <line
              x1={0}
              x2={innerW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#e5e7eb"
              strokeDasharray={t === 0 ? "" : "2 3"}
            />
            <text
              x={-6}
              y={yScale(t)}
              fontSize={10}
              textAnchor="end"
              dominantBaseline="middle"
              fill="currentColor"
            >
              {formatHours(t)}
            </text>
          </g>
        ))}

        {/* Reference lines */}
        {[p50, p90].map((v, i) => (
          <g key={i}>
            <line
              x1={0}
              x2={innerW}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke={i === 0 ? "#22c55e" : "#f59e0b"}
              strokeDasharray="4 4"
            />
            <text
              x={innerW - 4}
              y={yScale(v) - 4}
              fontSize={10}
              textAnchor="end"
              fill={i === 0 ? "#16a34a" : "#d97706"}
            >
              p{i === 0 ? "50" : "90"} · {formatHours(v)}
            </text>
          </g>
        ))}

        {sorted.map((d) => (
          <circle
            key={d.issue_id}
            cx={xScale(new Date(d.completed_at).getTime())}
            cy={yScale(d.cycle_hours)}
            r={4}
            fill="#3b82f6"
            opacity={0.7}
          >
            <title>
              {d.key} — {formatHours(d.cycle_hours)}{"\n"}
              {d.title}
            </title>
          </circle>
        ))}

        <text x={0} y={innerH + 16} fontSize={10} fill="currentColor">
          {new Date(minT).toLocaleDateString()}
        </text>
        <text
          x={innerW}
          y={innerH + 16}
          fontSize={10}
          textAnchor="end"
          fill="currentColor"
        >
          {new Date(maxT).toLocaleDateString()}
        </text>
      </g>
    </svg>
  );
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function niceCeil(n: number) {
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / step) * step;
}

function ticks(max: number) {
  const out: number[] = [];
  const step = max <= 10 ? Math.max(1, Math.round(max / 5)) : max / 5;
  for (let v = 0; v <= max + 0.001; v += step) out.push(Math.round(v));
  return out;
}
