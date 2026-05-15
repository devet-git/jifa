"use client";

import { use, useState } from "react";
import { useIssues } from "@/hooks/useIssues";
import { usePermissionsStore } from "@/store/permissions";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Issue } from "@/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

export default function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const pad = (d: Date) => d.toISOString().split("T")[0];

  const { data: issues = [], isLoading } = useIssues({
    project_id: id,
    due_date_from: pad(firstDay),
    due_date_to: pad(lastDay),
  });

  const byDay: Record<number, Issue[]> = {};
  for (const issue of issues) {
    if (!issue.due_date) continue;
    const d = new Date(issue.due_date).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(issue);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Build grid cells: leading blanks + days of month
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  if (!can("issue.view")) {
    return (
      <div className="h-full p-8 overflow-auto flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="font-semibold text-foreground mb-1">No access</p>
          <p className="text-sm text-muted leading-relaxed">
            You don't have permission to view issues in this project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-4 pb-4 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition text-muted hover:text-foreground"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-lg font-bold min-w-[160px] text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition text-muted hover:text-foreground"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px]" />
            ))}
          </div>
        ) : (
        <>
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`blank-${i}`} className="min-h-[90px] rounded-lg" />;
            }
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const dayIssues = byDay[day] ?? [];

            return (
              <div
                key={day}
                className={`min-h-[90px] rounded-lg border p-1.5 ${
                  isToday
                    ? "border-brand bg-brand/5"
                    : "border-border bg-surface hover:bg-surface-2"
                } transition`}
              >
                <p className={`text-xs font-semibold mb-1 ${isToday ? "text-brand" : "text-muted"}`}>
                  {day}
                </p>
                <div className="space-y-0.5">
                  {dayIssues.slice(0, 3).map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="w-full flex items-center gap-1 text-left hover:opacity-80 transition"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[issue.priority] ?? "bg-slate-400"}`} />
                      <span className="text-[10px] text-foreground truncate">{issue.title}</span>
                    </button>
                  ))}
                  {dayIssues.length > 3 && (
                    <p className="text-[10px] text-muted pl-2.5">+{dayIssues.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
