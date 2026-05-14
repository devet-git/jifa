"use client";

import type { BurndownPoint } from "@/hooks/useReports";

interface Props {
  data: BurndownPoint[];
}

const W = 720;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 40 };

export function BurndownChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Start the sprint to see burndown data.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const total = Math.max(
    1,
    ...data.flatMap((d) => [d.ideal, d.remaining < 0 ? 0 : d.remaining]),
  );
  const niceMax = niceCeil(total);
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const yScale = (v: number) => innerH - (v / niceMax) * innerH;

  const idealPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${i * xStep} ${yScale(d.ideal)}`)
    .join(" ");

  // Skip "future" points (remaining = -1).
  const actualPoints = data
    .map((d, i) => (d.remaining < 0 ? null : { x: i * xStep, y: yScale(d.remaining) }))
    .filter((p): p is { x: number; y: number } => p !== null);
  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-gray-600"
      role="img"
    >
      <g transform={`translate(${PAD.left}, ${PAD.top})`}>
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

        <path
          d={idealPath}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <path
          d={actualPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
        />
        {actualPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2563eb" />
        ))}

        {/* x labels: first, middle, last */}
        {[0, Math.floor(data.length / 2), data.length - 1]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .map((i) => (
            <text
              key={i}
              x={i * xStep}
              y={innerH + 16}
              fontSize={10}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fill="currentColor"
            >
              {data[i].date.slice(5)}
            </text>
          ))}
      </g>

      <g transform={`translate(${PAD.left}, ${H - 8})`}>
        <line x1={0} x2={20} y1={-4} y2={-4} stroke="#94a3b8" strokeDasharray="4 4" />
        <text x={26} y={0} fontSize={11} fill="currentColor">
          Ideal
        </text>
        <line x1={90} x2={110} y1={-4} y2={-4} stroke="#2563eb" strokeWidth={2} />
        <text x={116} y={0} fontSize={11} fill="currentColor">
          Actual remaining
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
