"use client";

import { useActivity } from "@/hooks/useActivity";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/formatDate";
import { useProjectFormat } from "@/lib/projectFormat";

interface Props {
  issueId: number;
}

const fieldLabels: Record<string, string> = {
  title: "title",
  description: "description",
  type: "type",
  status: "status",
  priority: "priority",
  story_points: "story points",
  due_date: "due date",
  assignee_id: "assignee",
  sprint_id: "sprint",
  parent_id: "epic",
  color: "color",
};

function displayValue(field: string, raw: string) {
  if (!raw) return <span className="text-gray-400 italic">none</span>;
  return <span className="font-medium">{raw}</span>;
}

export function ActivityFeed({ issueId }: Props) {
  const { data: entries = [] } = useActivity(issueId);
  const { dateFormat, timeFormat } = useProjectFormat();

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <Avatar name={a.user?.name} size="sm" />
          <div className="flex-1">
            <p>
              <span className="font-medium">{a.user?.name ?? "Someone"}</span>{" "}
              <span className="text-gray-500">
                changed {fieldLabels[a.field] ?? a.field}
              </span>{" "}
              {displayValue(a.field, a.old_value)}{" "}
              <span className="text-gray-500">→</span>{" "}
              {displayValue(a.field, a.new_value)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(a.created_at, dateFormat, timeFormat)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
