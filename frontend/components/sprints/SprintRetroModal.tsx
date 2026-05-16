"use client";

import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { useSprintRetro } from "@/hooks/useSprints";
import type { Issue } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number | string;
  sprintId: number | null;
}

export function SprintRetroModal({ open, onClose, projectId, sprintId }: Props) {
  const { data, isLoading } = useSprintRetro(projectId, sprintId);

  return (
    <Modal open={open} onClose={onClose} title="Sprint Retrospective" size="xl">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-6 h-6 text-brand" />
        </div>
      )}
      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-6 p-4 bg-surface-2 rounded-xl">
            <div>
              <p className="text-xs text-muted">Sprint</p>
              <p className="font-semibold text-foreground">{data.sprint.name}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>Story Points Delivered</span>
                <span className="font-medium text-foreground">
                  {data.delivered_points} / {data.committed_points}
                </span>
              </div>
              <Progress
                value={
                  data.committed_points > 0
                    ? Math.min(
                        100,
                        (data.delivered_points / data.committed_points) * 100,
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
                {data.delivered_issues} / {data.committed_issues}
              </p>
            </div>
          </div>

          <Section
            title="Completed"
            count={data.completed.length}
            color="green"
            issues={data.completed}
          />
          <Section
            title="Not Completed"
            count={data.not_completed.length}
            color="amber"
            issues={data.not_completed}
          />
          <Section
            title="Scope Added Mid-Sprint"
            count={data.scope_added.length}
            color="blue"
            issues={data.scope_added}
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
}: {
  title: string;
  count: number;
  color: "green" | "amber" | "blue";
  issues: Issue[];
}) {
  const borderColor = { green: "border-green-500", amber: "border-amber-500", blue: "border-blue-500" }[color];
  const badgeColor = { green: "bg-green-500/15 text-green-400", amber: "bg-amber-500/15 text-amber-400", blue: "bg-blue-500/15 text-blue-400" }[color];

  if (count === 0) return null;

  return (
    <div className={`border-l-2 ${borderColor} pl-4`}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>{count}</span>
      </div>
      <div className="space-y-1.5">
        {issues.map((issue) => (
          <div key={issue.id} className="flex items-center gap-2 text-sm">
            <span className="text-xs font-mono text-muted shrink-0">{issue.key || `#${issue.number}`}</span>
            <span className="text-foreground truncate">{issue.title}</span>
            {issue.story_points != null && (
              <span className="ml-auto shrink-0 text-xs text-muted">{issue.story_points}pt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
