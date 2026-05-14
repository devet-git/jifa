"use client";

import type { VelocityEntry } from "@/hooks/useReports";

interface Props {
  data: VelocityEntry[];
}

const W = 720;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 50, left: 40 };

export function VelocityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No completed sprints yet.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxY = Math.max(
    1,
    ...data.flatMap((d) => [d.committed_points, d.completed_points]),
  );

  const niceMax = niceCeil(maxY);
  const yScale = (v: number) => innerH - (v / niceMax) * innerH;
  const groupW = innerW / data.length;
  const barW = Math.min(28, (groupW - 8) / 2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-gray-600"
      role="img"
    >
      <g transform={`translate(${PAD.left}, ${PAD.top})`}>
        {/* Y axis grid */}
        {ticks(niceMax).map((t) => (
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
              {t}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = i * groupW + groupW / 2;
          return (
            <g key={d.sprint_id}>
              <rect
                x={cx - barW - 2}
                y={yScale(d.committed_points)}
                width={barW}
                height={innerH - yScale(d.committed_points)}
                fill="#93c5fd"
                rx={2}
              >
                <title>Committed: {d.committed_points} pts</title>
              </rect>
              <rect
                x={cx + 2}
                y={yScale(d.completed_points)}
                width={barW}
                height={innerH - yScale(d.completed_points)}
                fill="#22c55e"
                rx={2}
              >
                <title>Completed: {d.completed_points} pts</title>
              </rect>
              <text
                x={cx}
                y={innerH + 16}
                fontSize={10}
                textAnchor="middle"
                fill="currentColor"
              >
                {truncate(d.sprint_name, 12)}
              </text>
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${H - 16})`}>
        <rect x={0} y={-4} width={10} height={10} fill="#93c5fd" rx={2} />
        <text x={16} y={4} fontSize={11} fill="currentColor">
          Committed
        </text>
        <rect x={90} y={-4} width={10} height={10} fill="#22c55e" rx={2} />
        <text x={106} y={4} fontSize={11} fill="currentColor">
          Completed
        </text>
      </g>
    </svg>
  );
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

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
