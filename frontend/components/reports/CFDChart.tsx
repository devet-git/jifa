"use client";

import type { CFDPoint } from "@/hooks/useReports";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ec4899", "#8b5cf6", "#ef4444", "#84cc16", "#f97316",
];

const W = 720;
const H = 260;
const PAD = { top: 16, right: 20, bottom: 48, left: 40 };

interface Props {
  data: CFDPoint[];
}

export function CFDChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-sm text-muted text-center py-8">No data yet.</p>;
  }

  const allKeys = Array.from(new Set(data.flatMap((d) => Object.keys(d.counts))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const totals = data.map((d) =>
    allKeys.reduce((s, k) => s + (d.counts[k] ?? 0), 0),
  );
  const maxY = Math.max(1, ...totals);
  const barW = Math.max(2, innerW / data.length - 1);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = innerH - f * innerH;
            return (
              <g key={f}>
                <line x1={0} x2={innerW} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray={f === 0 ? "" : "2 3"} />
                <text x={-6} y={y} fontSize={10} textAnchor="end" dominantBaseline="middle" fill="#94a3b8">
                  {Math.round(f * maxY)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const x = i * (innerW / data.length);
            let yOffset = innerH;
            return (
              <g key={d.date}>
                {allKeys.map((key, ki) => {
                  const v = d.counts[key] ?? 0;
                  const h = (v / maxY) * innerH;
                  yOffset -= h;
                  return (
                    <rect
                      key={key}
                      x={x}
                      y={yOffset}
                      width={barW}
                      height={h}
                      fill={COLORS[ki % COLORS.length]}
                      opacity={0.85}
                    >
                      <title>{key}: {v} on {d.date}</title>
                    </rect>
                  );
                })}
                {i % 5 === 0 && (
                  <text x={x + barW / 2} y={innerH + 14} fontSize={9} textAnchor="middle" fill="#94a3b8">
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
        {allKeys.map((key, i) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
