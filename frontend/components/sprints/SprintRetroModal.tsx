"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { useSprintRetro, type SprintRetro } from "@/hooks/useSprints";
import type { Issue } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number | string;
  sprintId: number | null;
}

export function SprintRetroModal({ open, onClose, projectId, sprintId }: Props) {
  const { data, isLoading } = useSprintRetro(projectId, sprintId);

  // Keep the last successfully loaded payload around while the modal animates
  // shut. Parents typically clear sprintId in the same tick as `open=false`,
  // which makes the query lose `data` immediately — without this cache, the
  // dialog body flashes empty during the exit transition.
  const [cached, setCached] = useState<SprintRetro | null>(null);
  useEffect(() => {
    if (data) setCached(data);
  }, [data]);
  // Only drop the cache once the modal is fully closed, so reopening for a
  // different sprint starts fresh.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setCached(null), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const display = data ?? cached;
  const isLive = display?.sprint.status === "active";

  return (
    <Modal open={open} onClose={onClose} title="Sprint Retrospective" size="xl">
      {isLoading && !display && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-6 h-6 text-brand" />
        </div>
      )}
      {display && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-6 p-4 bg-surface-2 rounded-xl">
            <div>
              <p className="text-xs text-muted">Sprint</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{display.sprint.name}</p>
                {isLive && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                    Live
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Story Points Delivered</span>
                <span className="font-medium text-foreground">
                  {display.delivered_points} / {display.committed_points}
                </span>
              </div>
              <Progress
                value={
                  display.committed_points > 0
                    ? Math.min(
                        100,
                        (display.delivered_points / display.committed_points) * 100,
                      )
                    : 0
                }
                className="!bg-surface"
                indicatorClassName="bg-green-500"
              />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Issues</p>
              <p className="font-semibold text-foreground">
                {display.delivered_issues} / {display.committed_issues}
              </p>
            </div>
          </div>

          {!display.has_snapshot && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              No commitment snapshot was captured for this sprint (it was never
              started, or was started before snapshotting was enabled). The
              numbers below reflect the current set of issues only — scope
              changes are not detectable.
            </div>
          )}

          <Section
            title="Completed"
            count={display.completed.length}
            color="green"
            issues={display.completed}
          />
          <Section
            title="Not Completed"
            count={display.not_completed.length}
            color="amber"
            issues={display.not_completed}
          />
          <Section
            title="Scope Added Mid-Sprint"
            count={display.scope_added.length}
            color="blue"
            issues={display.scope_added}
            footer={
              display.scope_added.length > 0
                ? `${display.scope_added_completed.length} of these were completed but do not count toward committed velocity.`
                : undefined
            }
            completedIds={
              new Set(display.scope_added_completed.map((i) => i.id))
            }
          />
          <Section
            title="Removed from Sprint"
            count={display.removed.length}
            color="rose"
            issues={display.removed}
            footer={
              display.removed.length > 0
                ? "These issues were committed but moved out of the sprint after it started."
                : undefined
            }
          />
        </div>
      )}
    </Modal>
  );
}

function Section({
  title,
  count,
  color,
  issues,
  footer,
  completedIds,
}: {
  title: string;
  count: number;
  color: "green" | "amber" | "blue" | "rose";
  issues: Issue[];
  footer?: string;
  completedIds?: Set<number>;
}) {
  const borderColor = {
    green: "border-green-500",
    amber: "border-amber-500",
    blue: "border-blue-500",
    rose: "border-rose-500",
  }[color];
  const badgeColor = {
    green: "bg-green-500/15 text-green-400",
    amber: "bg-amber-500/15 text-amber-400",
    blue: "bg-blue-500/15 text-blue-400",
    rose: "bg-rose-500/15 text-rose-400",
  }[color];

  if (count === 0) return null;

  return (
    <div className={`border-l-2 ${borderColor} pl-4`}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>{count}</span>
      </div>
      <div className="space-y-1.5">
        {issues.map((issue) => {
          const isDone = completedIds?.has(issue.id);
          return (
            <div key={issue.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs font-mono text-muted shrink-0">{issue.key || `#${issue.number}`}</span>
              <span className="text-foreground truncate">{issue.title}</span>
              {isDone && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium shrink-0">
                  Done
                </span>
              )}
              {issue.story_points != null && (
                <span className="ml-auto shrink-0 text-xs text-muted">{issue.story_points}pt</span>
              )}
            </div>
          );
        })}
      </div>
      {footer && <p className="text-[11px] text-muted mt-2">{footer}</p>}
    </div>
  );
}
