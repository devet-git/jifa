"use client";

import { usePermissionsStore } from "@/store/permissions";
import { Modal } from "@/components/ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

const PERMISSION_LABELS: Record<
  string,
  { name: string; group: string; description: string }
> = {
  "project.view": {
    name: "View Project",
    group: "Project",
    description: "Browse the project and view its details",
  },
  "project.edit": {
    name: "Edit Project",
    group: "Project",
    description: "Update project name, description, and settings",
  },
  "project.delete": {
    name: "Delete Project",
    group: "Project",
    description: "Permanently delete the project",
  },

  "issue.view": {
    name: "View Issues",
    group: "Issue",
    description: "View issue details and lists",
  },
  "issue.create": {
    name: "Create Issues",
    group: "Issue",
    description: "Create new issues in the project",
  },
  "issue.edit": {
    name: "Edit Issues",
    group: "Issue",
    description: "Edit issue fields such as title, description, priority",
  },
  "issue.delete": {
    name: "Delete Issues",
    group: "Issue",
    description: "Delete issues",
  },
  "issue.assign": {
    name: "Assign Issues",
    group: "Issue",
    description: "Assign issues to users",
  },
  "issue.comment": {
    name: "Comment on Issues",
    group: "Issue",
    description: "Add, edit, and delete comments on issues",
  },
  "issue.rank": {
    name: "Rank Issues",
    group: "Issue",
    description: "Reorder issues on backlog and board",
  },
  "issue.worklog": {
    name: "Log Work",
    group: "Issue",
    description: "Log time on issues",
  },
  "issue.manage-attachment": {
    name: "Manage Attachments",
    group: "Issue",
    description: "Upload and delete attachments",
  },
  "issue.manage-link": {
    name: "Manage Issue Links",
    group: "Issue",
    description: "Add and remove issue links",
  },

  "sprint.create": {
    name: "Create Sprints",
    group: "Sprint",
    description: "Create new sprints",
  },
  "sprint.edit": {
    name: "Edit Sprints",
    group: "Sprint",
    description: "Edit sprint name, goal, and dates",
  },
  "sprint.delete": {
    name: "Delete Sprints",
    group: "Sprint",
    description: "Delete sprints",
  },
  "sprint.manage": {
    name: "Manage Sprints",
    group: "Sprint",
    description: "Start and complete sprints",
  },

  "version.create": {
    name: "Create Versions",
    group: "Version",
    description: "Create new versions",
  },
  "version.edit": {
    name: "Edit Versions",
    group: "Version",
    description: "Edit version details",
  },
  "version.delete": {
    name: "Delete Versions",
    group: "Version",
    description: "Delete versions",
  },
  "version.release": {
    name: "Release Versions",
    group: "Version",
    description: "Release and archive versions",
  },

  "board.create": {
    name: "Create Boards",
    group: "Board",
    description: "Create new boards",
  },
  "board.edit": {
    name: "Edit Boards",
    group: "Board",
    description: "Edit board configuration",
  },
  "board.delete": {
    name: "Delete Boards",
    group: "Board",
    description: "Delete boards",
  },

  "wiki.create": {
    name: "Create Wiki Pages",
    group: "Wiki",
    description: "Create new wiki pages",
  },
  "wiki.edit": {
    name: "Edit Wiki Pages",
    group: "Wiki",
    description: "Edit wiki pages",
  },
  "wiki.delete": {
    name: "Delete Wiki Pages",
    group: "Wiki",
    description: "Delete wiki pages",
  },

  "component.create": {
    name: "Create Components",
    group: "Component",
    description: "Create new components",
  },
  "component.edit": {
    name: "Edit Components",
    group: "Component",
    description: "Edit component details",
  },
  "component.delete": {
    name: "Delete Components",
    group: "Component",
    description: "Delete components",
  },

  "member.view": {
    name: "View Members",
    group: "Member",
    description: "View the member list",
  },
  "member.invite": {
    name: "Invite Members",
    group: "Member",
    description: "Add new members to the project",
  },
  "member.role-change": {
    name: "Change Member Roles",
    group: "Member",
    description: "Change role assignments",
  },
  "member.remove": {
    name: "Remove Members",
    group: "Member",
    description: "Remove members from the project",
  },

  "workflow.edit": {
    name: "Edit Workflow",
    group: "Workflow",
    description: "Create, edit, and reorder statuses",
  },

  "webhook.manage": {
    name: "Manage Webhooks",
    group: "Webhook",
    description: "Create, edit, and delete webhooks",
  },

  "audit.view": {
    name: "View Audit Log",
    group: "Audit",
    description: "View the audit log",
  },
  "audit.export": {
    name: "Export Audit Log",
    group: "Audit",
    description: "Export the audit log to CSV",
  },
};

const GROUP_ORDER = [
  "Project",
  "Issue",
  "Sprint",
  "Version",
  "Board",
  "Wiki",
  "Component",
  "Member",
  "Workflow",
  "Webhook",
  "Audit",
];

export function MyPermissionsModal({ open, onClose, projectName }: Props) {
  const perms = usePermissionsStore((s) => s.perms);

  const grouped = GROUP_ORDER.map((group) => {
    const items = Object.entries(PERMISSION_LABELS)
      .filter(([key, info]) => info.group === group)
      .map(([key, info]) => ({
        key,
        ...info,
        granted: perms.has(key),
      }));
    return { group, items };
  }).filter((g) => g.items.length > 0);

  const grantedCount = Object.keys(PERMISSION_LABELS).filter((k) =>
    perms.has(k),
  ).length;
  const totalCount = Object.keys(PERMISSION_LABELS).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Permission in ${projectName} project`}
      size="lg"
    >
      {/* {projectName && <p className="text-sm text-muted mb-4">{projectName}</p>} */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 flex-1 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
            style={{ width: `${(grantedCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted font-medium whitespace-nowrap">
          {grantedCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {group}
            </h3>
            <div className="space-y-1">
              {items.map(({ key, name, description, granted }) => (
                <div
                  key={key}
                  className={`flex items-start gap-3 px-3 py-2 rounded-lg text-sm ${
                    granted
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "bg-surface-2/50 opacity-60"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      granted
                        ? "bg-emerald-500"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${granted ? "text-foreground" : "text-muted"}`}
                    >
                      {name}
                    </p>
                    <p className="text-xs text-muted">{description}</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono shrink-0 ${
                      granted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {granted ? "✓" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
