"use client";

import { use, useMemo, useState } from "react";
import { useIssues } from "@/hooks/useIssues";
import { usePermissionsStore } from "@/store/permissions";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { Progress } from "@/components/ui/Progress";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { Issue, IssueStatus } from "@/types";

export default function EpicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const { data: allIssues = [], isLoading } = useIssues({ project_id: id });
  const [selected, setSelected] = useState<Issue | null>(null);

  const epics = useMemo(
    () => allIssues.filter((i) => i.type === "epic"),
    [allIssues],
  );

  function childrenOf(epicId: number) {
    return allIssues.filter(
      (i) => i.parent_id === epicId && i.type !== "epic",
    );
  }

  function progress(children: Issue[]) {
    if (children.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = children.filter((i) => i.status === "done").length;
    return { done, total: children.length, pct: (done / children.length) * 100 };
  }

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

  if (isLoading) {
    return (
      <div className="h-full p-8 overflow-auto max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="h-full p-8 overflow-auto">
        {epics.length === 0 ? (
          <div className="surface-card p-12 text-center max-w-2xl mx-auto">
            <div className="mx-auto w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No epics yet</p>
            <p className="text-sm text-muted">
              Create an issue of type <span className="font-mono text-foreground">epic</span> to track large initiatives.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {epics.map((epic) => {
              const children = childrenOf(epic.id);
              const p = progress(children);
              const statusBreakdown = breakdown(children);
              return (
                <button
                  key={epic.id}
                  onClick={() => setSelected(epic)}
                  className="block w-full text-left surface-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 ring-2 ring-surface"
                      style={{ backgroundColor: epic.color || "#94a3b8" }}
                    />
                    <span className="font-mono text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                      {epic.key ?? `#${epic.id}`}
                    </span>
                    <span className="font-semibold flex-1 truncate">
                      {epic.title}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      {p.done}/{p.total} done
                    </span>
                  </div>
                  <Progress
                    value={p.pct}
                    indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                  <div className="flex gap-3 mt-2 text-[11px] text-muted">
                    {Object.entries(statusBreakdown).map(([s, n]) => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s === "done" ? "bg-emerald-500" :
                          s === "in_progress" ? "bg-blue-500" :
                          s === "in_review" ? "bg-amber-500" : "bg-slate-400"
                        }`} />
                        {labelForStatus(s as IssueStatus)}: <span className="text-foreground font-medium">{n}</span>
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <IssueDetail issue={selected} onClose={() => setSelected(null)} />
        )}
    </div>
  );
}

function breakdown(issues: Issue[]) {
  return issues.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<IssueStatus, number>,
  );
}

function labelForStatus(s: IssueStatus) {
  return {
    todo: "To Do",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
  }[s];
}
