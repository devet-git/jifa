"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/useProject";
import { useIssues } from "@/hooks/useIssues";
import { IssueDetail } from "@/components/issues/IssueDetail";
import type { Issue, IssueStatus } from "@/types";

export default function EpicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { data: allIssues = [] } = useIssues({ project_id: id });
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
        <h1 className="text-2xl font-bold tracking-tight">Epics</h1>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {epics.length === 0 ? (
          <div className="surface-card p-12 text-center max-w-2xl mx-auto">
            <div className="mx-auto w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No epics yet</p>
            <p className="text-sm text-muted">
              Tạo issue với loại <span className="font-mono text-foreground">epic</span> để theo dõi sáng kiến lớn.
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
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
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
      </div>

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
