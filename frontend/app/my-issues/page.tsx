"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { IssueCard } from "@/components/issues/IssueCard";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Issue, IssueStatus } from "@/types";

const STATUSES: IssueStatus[] = ["todo", "in_progress", "in_review", "done"];

export default function MyIssuesPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<Issue | null>(null);
  const [hideDone, setHideDone] = useState(true);

  // No dedicated endpoint — reuse /issues filtered by assignee_id. The server
  // already restricts results to accessible projects.
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["issues", { assignee_id: user?.id }],
    queryFn: () =>
      api.get(`/issues?assignee_id=${user!.id}`).then((r) => r.data),
    enabled: !!user,
  });

  const grouped = useMemo(() => {
    const out: Record<IssueStatus, Issue[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const i of issues) out[i.status]?.push(i);
    return out;
  }, [issues]);

  const visibleStatuses = hideDone
    ? STATUSES.filter((s) => s !== "done")
    : STATUSES;
  const total = visibleStatuses.reduce((n, s) => n + grouped[s].length, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My issues</h1>
          <p className="text-sm text-muted mt-1">
            <span className="font-medium text-foreground">{total}</span> open issue
            {total === 1 ? "" : "s"} assigned to you across all projects.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer surface-card px-3 py-2">
          <Checkbox
            checked={hideDone}
            onCheckedChange={(v) => setHideDone(v === true)}
          />
          Hide done
        </label>
      </div>

      <div className="space-y-4">
        {visibleStatuses.map((s) => (
          <section key={s} className="surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-2/60 flex items-center gap-2">
              <Badge type="status" value={s} showDot />
              <span className="text-[11px] font-medium bg-surface text-muted rounded-full px-2 py-0.5 ring-1 ring-border">
                {grouped[s].length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-16" />
                  <div className="skeleton h-16" />
                </div>
              ) : grouped[s].length === 0 ? (
                <p className="text-xs text-muted text-center py-4 italic">
                  Nothing here.
                </p>
              ) : (
                grouped[s].map((i) => (
                  <IssueCard
                    key={i.id}
                    issue={i}
                    onClick={() => setSelected(i)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {selected && (
        <IssueDetail issue={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
