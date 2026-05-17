"use client";

import { useMemo } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useIssue, useIssues } from "@/hooks/useIssues";
import { useUsers } from "@/hooks/useUsers";
import { useSprints } from "@/hooks/useSprints";
import { useVersions } from "@/hooks/useVersions";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { formatDate } from "@/lib/formatDate";
import { useProjectFormat } from "@/lib/projectFormat";
import { mdToHtml } from "@/lib/convertMd";
import { GitBranch } from "lucide-react";

interface Props {
  issueId: number;
}

const DATE_FIELDS = new Set(["due_date", "start_date"]);

const REFERENCE_FIELDS = new Set([
  "assignee_id",
  "reporter_id",
  "sprint_id",
  "parent_id",
  "version_id",
]);

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
  reporter_id: "reporter",
  sprint_id: "sprint",
  parent_id: "epic",
  version_id: "version",
  color: "color",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  lowest: "Lowest",
  low: "Low",
  medium: "Medium",
  high: "High",
  highest: "Highest",
};

const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  bug: "Bug",
  story: "Story",
  epic: "Epic",
  subtask: "Sub-task",
};

export function ActivityFeed({ issueId }: Props) {
  const { data: entries = [] } = useActivity(issueId);
  const { data: issue } = useIssue(issueId);
  const { dateFormat, timeFormat } = useProjectFormat();

  const projectId = issue?.project_id;

  // Only fetch reference data when activity rows actually need it.
  const needsUsers = useMemo(
    () =>
      entries.some(
        (a) => a.field === "assignee_id" || a.field === "reporter_id",
      ),
    [entries],
  );
  const needsSprints = useMemo(
    () => entries.some((a) => a.field === "sprint_id"),
    [entries],
  );
  const needsVersions = useMemo(
    () => entries.some((a) => a.field === "version_id"),
    [entries],
  );
  const needsIssues = useMemo(
    () => entries.some((a) => a.field === "parent_id"),
    [entries],
  );

  const { data: users = [] } = useUsers();
  // Passing 0 disables the query (hook checks `enabled: !!projectId`).
  const { data: sprints = [] } = useSprints(
    needsSprints && projectId ? projectId : 0,
  );
  const { data: versions = [] } = useVersions(
    needsVersions && projectId ? projectId : 0,
  );
  const { data: projectIssues = [] } = useIssues(
    needsIssues && projectId ? { project_id: projectId } : {},
  );

  const lookup = useMemo(() => {
    // Email disambiguates users who share a name.
    const userMap = new Map<string, string>();
    if (needsUsers) {
      for (const u of users) {
        userMap.set(
          String(u.id),
          u.email ? `${u.name} (${u.email})` : u.name,
        );
      }
    }
    const sprintMap = new Map<string, string>();
    if (needsSprints) {
      for (const s of sprints) sprintMap.set(String(s.id), s.name);
    }
    const versionMap = new Map<string, string>();
    if (needsVersions) {
      for (const v of versions) versionMap.set(String(v.id), v.name);
    }
    const issueMap = new Map<string, string>();
    if (needsIssues) {
      for (const i of projectIssues) {
        const label = i.key ? `${i.key} ${i.title}` : i.title;
        issueMap.set(String(i.id), label);
      }
    }
    return { userMap, sprintMap, versionMap, issueMap };
  }, [
    needsUsers,
    needsSprints,
    needsVersions,
    needsIssues,
    users,
    sprints,
    versions,
    projectIssues,
  ]);

  function resolveRef(field: string, raw: string): string {
    if (!raw) return "";
    switch (field) {
      case "assignee_id":
      case "reporter_id":
        return lookup.userMap.get(raw) ?? `User #${raw}`;
      case "sprint_id":
        return lookup.sprintMap.get(raw) ?? `Sprint #${raw}`;
      case "version_id":
        return lookup.versionMap.get(raw) ?? `Version #${raw}`;
      case "parent_id":
        return lookup.issueMap.get(raw) ?? `Issue #${raw}`;
      default:
        return raw;
    }
  }

  function displayValue(field: string, raw: string) {
    if (!raw) return <span className="text-gray-400 italic">none</span>;
    if (DATE_FIELDS.has(field)) {
      return (
        <span className="font-medium">
          {formatDate(raw, dateFormat, timeFormat)}
        </span>
      );
    }
    if (REFERENCE_FIELDS.has(field)) {
      return <span className="font-medium">{resolveRef(field, raw)}</span>;
    }
    if (field === "status") {
      return (
        <span className="font-medium">{STATUS_LABELS[raw] ?? raw}</span>
      );
    }
    if (field === "priority") {
      return (
        <span className="font-medium">{PRIORITY_LABELS[raw] ?? raw}</span>
      );
    }
    if (field === "type") {
      return <span className="font-medium">{TYPE_LABELS[raw] ?? raw}</span>;
    }
    if (field === "description") {
      return (
        <span
          className="inline [&_p]:inline [&_p]:m-0 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: mdToHtml(raw) }}
        />
      );
    }
    return <span className="font-medium">{raw}</span>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((a) => {
        // System rows (e.g. GitLab webhooks) have user=null.
        const isSystem = !a.user?.id;
        // gitlab_source is a synthetic field annotating the trigger.
        if (a.field === "gitlab_source") {
          return (
            <li key={a.id} className="flex gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <GitBranch className="w-3 h-3 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500">
                  Triggered by{" "}
                  <span className="font-medium text-foreground">
                    {a.new_value}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(a.created_at, dateFormat, timeFormat)}
                </p>
              </div>
            </li>
          );
        }
        return (
          <li key={a.id} className="flex gap-3 text-sm">
            {isSystem ? (
              <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <GitBranch className="w-3 h-3 text-orange-500" />
              </div>
            ) : (
              <UserHoverCard user={a.user} side="right" align="start">
                <Avatar
                  name={a.user?.name}
                  src={a.user?.avatar}
                  size="sm"
                />
              </UserHoverCard>
            )}
            <div className="flex-1">
              <p>
                <span className="font-medium">
                  {isSystem ? "GitLab" : a.user?.name ?? "Someone"}
                </span>{" "}
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
        );
      })}
    </ul>
  );
}
