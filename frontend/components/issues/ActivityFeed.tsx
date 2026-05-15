"use client";

import { useActivity } from "@/hooks/useActivity";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { formatDate } from "@/lib/formatDate";
import { useProjectFormat } from "@/lib/projectFormat";
import { mdToHtml } from "@/lib/convertMd";

interface Props {
  issueId: number;
}

const DATE_FIELDS = new Set(["due_date", "start_date"]);

const fieldLabels: Record<string, string> = {
  title: "title",
  description: "description",
  type: "type",
  status: "status",
  priority: "priority",
  story_points: "story points",
  due_date: "due date",
  start_date: "start date",
  assignee_id: "assignee",
  sprint_id: "sprint",
  parent_id: "epic",
  color: "color",
};

function displayValue(field: string, raw: string, dfmt: string, tfmt: string) {
  if (!raw) return <span className="text-gray-400 italic">none</span>;
  if (DATE_FIELDS.has(field)) {
    return <span className="font-medium">{formatDate(raw, dfmt, tfmt)}</span>;
  }
  if (field === "description") {
    return <span className="inline [&_p]:inline [&_p]:m-0 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: mdToHtml(raw) }} />;
  }
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
          <UserHoverCard user={a.user} side="right" align="start">
            <Avatar name={a.user?.name} src={a.user?.avatar} size="sm" />
          </UserHoverCard>
          <div className="flex-1">
            <p>
              <span className="font-medium">{a.user?.name ?? "Someone"}</span>{" "}
              <span className="text-gray-500">
                changed {fieldLabels[a.field] ?? a.field}
              </span>{" "}
              {displayValue(a.field, a.old_value, dateFormat, timeFormat)}{" "}
              <span className="text-gray-500">→</span>{" "}
              {displayValue(a.field, a.new_value, dateFormat, timeFormat)}
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
