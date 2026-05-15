"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/api";
import { useProject, useUpdateProject } from "@/hooks/useProject";
import {
  DATE_FORMATS,
  TIME_FORMATS,
  fmt,
  fmtTime,
  formatDate,
} from "@/lib/formatDate";
import {
  useMembers,
  useAddMember,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/hooks/useMembers";
import {
  useComponents,
  useCreateComponent,
  useUpdateComponent,
  useDeleteComponent,
  useReorderComponents,
} from "@/hooks/useComponents";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
} from "@/hooks/useWebhooks";
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useReorderStatuses,
  useDeleteStatus,
} from "@/hooks/useStatuses";
import {
  useBoards,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
} from "@/hooks/useBoards";
import { useAudit } from "@/hooks/useAudit";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { showConfirm } from "@/store/confirm";
import { usePermissionsStore } from "@/store/permissions";
import { useMyPermissions, usePermissions } from "@/hooks/usePermissions";
import {
  useRoles,
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
  useRolePermissions,
  useSetRolePermissions,
} from "@/hooks/useRoles";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Checkbox } from "@/components/ui/Checkbox";
import type {
  BacklogFilterState,
  Board,
  Component,
  IssuePriority,
  IssueType,
  Permission,
  Project,
  ProjectRole,
  Role,
  StatusCategory,
  StatusDefinition,
  Webhook,
  WebhookEvent,
} from "@/types";

type Tab =
  | "members"
  | "permissions"
  | "workflow"
  | "boards"
  | "components"
  | "webhooks"
  | "audit"
  | "details";

const STATUS_COLORS = [
  "#9ca3af",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#a78bfa",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "comment.created",
  "sprint.started",
  "sprint.completed",
];

const roleLabels: Record<ProjectRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleStyles: Record<ProjectRole, string> = {
  admin:
    "bg-[var(--brand-soft)] text-[var(--brand)] border border-[color-mix(in_srgb,var(--brand)_20%,transparent)]",
  member:
    "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20",
  viewer: "bg-surface-2 text-muted border border-border",
};

const categoryStyles: Record<StatusCategory, string> = {
  todo: "bg-surface-2 text-muted border border-border",
  in_progress:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  done: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
};

const categoryLabels: Record<StatusCategory, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const tabConfig: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "members",
    label: "Members",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 0 0-1.5-4.33A5 5 0 0 1 19 16v1h-6.07zM6 11a5 5 0 0 1 5 5v1H1v-1a5 5 0 0 1 5-5z" />
      </svg>
    ),
  },
  {
    key: "permissions",
    label: "Permissions",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0 1 10 0v2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm8-2v2H7V7a3 3 0 0 1 6 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    key: "workflow",
    label: "Workflow",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    key: "boards",
    label: "Boards",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zM2 10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6z" />
      </svg>
    ),
  },
  {
    key: "components",
    label: "Components",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7zM4 7a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zM2 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
      </svg>
    ),
  },
  {
    key: "webhooks",
    label: "Webhooks",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12.316 3.051a1 1 0 0 1 .633 1.265l-4 12a1 1 0 1 1-1.898-.632l4-12a1 1 0 0 1 1.265-.633zM5.707 6.293a1 1 0 0 1 0 1.414L3.414 10l2.293 2.293a1 1 0 1 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 0zm8.586 0a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 1 1-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 0 1 0-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    key: "audit",
    label: "Audit",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },

  {
    key: "details",
    label: "Details",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "members";
  const setTab = useCallback(
    (t: Tab) => {
      router.replace(`/projects/${id}/settings?tab=${t}`, { scroll: false });
    },
    [id, router],
  );

  const { data: project, isLoading } = useProject(id);
  const { data: members = [] } = useMembers(id);
  const { data: roles = [] } = useRoles(id);
  const { data: permissions = [] } = usePermissions(id);
  const { data: myPermKeys } = useMyPermissions(id);
  const { user } = useAuthStore();

  const addMember = useAddMember(id);
  const updateRole = useUpdateMemberRole(id);
  const removeMember = useRemoveMember(id);
  const update = useUpdateProject();

  useEffect(() => {
    usePermissionsStore.getState().clear();
    if (myPermKeys) {
      usePermissionsStore.getState().setPerms(Number(id), myPermKeys);
    }
  }, [id, myPermKeys]);

  const getCan = usePermissionsStore((s) => s.can);
  const roleById = Object.fromEntries(roles.map((r) => [r.id, r]));
  const myMembership = members.find((m) => m.user_id === user?.id);
  const myRole = myMembership ? roleById[myMembership.role_id] : undefined;
  const canManageMembers = getCan("member.role-change");

  const [form, setForm] = useState<{ email: string; role_id: number }>({
    email: "",
    role_id: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const memberRoleID = roles.find((r) => r.name === "Member")?.id ?? 0;

  const visibleTabs = tabConfig.filter((t) => {
    switch (t.key) {
      case "members":
        return true;
      case "permissions":
        return myPermKeys?.includes("member.role-change");
      case "workflow":
        return myPermKeys?.includes("workflow.edit");
      case "boards":
        return myPermKeys?.some((k) => k.startsWith("board."));
      case "components":
        return myPermKeys?.some((k) => k.startsWith("component."));
      case "webhooks":
        return myPermKeys?.includes("webhook.manage");
      case "audit":
        return myPermKeys?.includes("audit.view");
      case "details":
        return myPermKeys?.includes("project.edit");
      default:
        return true;
    }
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const role_id = form.role_id || memberRoleID;
    try {
      await addMember.mutateAsync({ email: form.email, role_id });
      setForm({ email: "", role_id: 0 });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add member");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-8 space-y-4 max-w-2xl">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-8 pt-6 pb-0 border-b border-border bg-surface">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            Back to project
          </Link>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-4">
          Settings
        </h1>
        <TabsList className="!bg-transparent !rounded-none !p-0 gap-0 -mb-px overflow-x-auto justify-start w-full">
          {visibleTabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="!rounded-none !bg-transparent !shadow-none inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 border-transparent transition-all whitespace-nowrap data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:!bg-transparent data-[state=active]:!shadow-none hover:border-border"
            >
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto">
        <TabsContent value="members" className="!mt-0">
          <div className="max-w-2xl space-y-4 animate-fade-in">
            {canManageMembers && (
              <div className="surface-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Add member
                </h2>
                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    className="input flex-1"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                  <Select
                    value={String(form.role_id)}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, role_id: Number(v) }))
                    }
                  >
                    <SelectTrigger className="w-auto min-w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Default (Member)</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" disabled={addMember.isPending}>
                    {addMember.isPending ? "Adding…" : "Add"}
                  </Button>
                </form>
                {error && (
                  <p className="text-sm text-[var(--danger)] mt-2.5">{error}</p>
                )}
              </div>
            )}

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center">
                <h2 className="text-sm font-semibold text-foreground">
                  Team
                  <span className="ml-1.5 text-xs font-normal text-muted">
                    ({members.length})
                  </span>
                </h2>
              </div>
              {members.length === 0 ? (
                <EmptyState
                  icon={
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                      />
                    </svg>
                  }
                  message="No members yet."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((m) => {
                    const isOwner = project?.owner_id === m.user_id;
                    return (
                      <li
                        key={m.id}
                        className="px-5 py-3.5 flex items-center gap-3"
                      >
                        <UserHoverCard user={m.user} side="right" align="start">
                          <Avatar name={m.user?.name} size="md" />
                        </UserHoverCard>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.user?.name}
                            {isOwner && (
                              <span className="ml-2 text-xs font-normal text-muted">
                                (owner)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {m.user?.email}
                          </p>
                        </div>
                        {canManageMembers && !isOwner ? (
                          <Select
                            value={String(m.role_id)}
                            onValueChange={(v) =>
                              updateRole.mutate({
                                memberId: m.id,
                                role_id: Number(v),
                              })
                            }
                          >
                            <SelectTrigger className="w-auto !text-xs !py-1 min-w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <RoleBadge role={m.role} />
                        )}
                        {canManageMembers && !isOwner && (
                          <button
                            onClick={async () => {
                              if (
                                await showConfirm({
                                  message: "Remove this member?",
                                })
                              )
                                removeMember.mutate(m.id);
                            }}
                            className="text-xs text-[var(--danger)] hover:opacity-70 transition-opacity"
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="components" className="!mt-0">
          <ComponentsTab projectId={id} />
        </TabsContent>
        <TabsContent value="workflow" className="!mt-0">
          <WorkflowTab projectId={id} />
        </TabsContent>
        <TabsContent value="boards" className="!mt-0">
          <BoardsTab projectId={id} />
        </TabsContent>
        <TabsContent value="webhooks" className="!mt-0">
          <WebhooksTab projectId={id} />
        </TabsContent>
        <TabsContent value="audit" className="!mt-0">
          <AuditTab
            projectId={id}
            dateFormat={project?.date_format}
            timeFormat={project?.time_format}
          />
        </TabsContent>

        <TabsContent value="permissions" className="!mt-0">
          <PermissionsTab
            projectId={id}
            permissions={permissions}
            roles={roles}
          />
        </TabsContent>

        <TabsContent value="details" className="!mt-0">
          <div className="max-w-2xl space-y-4 animate-fade-in">
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Project details
              </h2>
              <dl className="space-y-3">
                <EditableField
                  label="Name"
                  value={project?.name ?? ""}
                  placeholder="Project name"
                  onSave={(v) => update.mutate({ id, name: v })}
                />
                <DetailRow
                  label="Key"
                  value={
                    <code className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded">
                      {project?.key}
                    </code>
                  }
                />
                <EditableField
                  label="Description"
                  value={project?.description ?? ""}
                  placeholder="Project description"
                  multiline
                  onSave={(v) => update.mutate({ id, description: v })}
                />
                <EditableField
                  label="Category"
                  value={project?.category ?? ""}
                  placeholder="e.g. Engineering, Marketing"
                  onSave={(v) =>
                    update.mutate({ id, category: v || undefined })
                  }
                />
              </dl>
            </div>
            <DateFormatSection project={project} projectId={id} />
            <ImportExportSection projectId={id} />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 text-sm">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}

function RoleBadge({ role }: { role: ProjectRole }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}

function CategoryBadge({ category }: { category: StatusCategory }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${categoryStyles[category]}`}
    >
      {categoryLabels[category]}
    </span>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function AuditTab({
  projectId,
  dateFormat,
  timeFormat,
}: {
  projectId: string;
  dateFormat?: string | null;
  timeFormat?: string | null;
}) {
  const { data: entries = [] } = useAudit(projectId);

  function exportCSV() {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
    fetch(`${base}/projects/${projectId}/audit/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${projectId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 transition text-foreground"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>
      <div className="surface-card overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                />
              </svg>
            }
            message="No audit entries yet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="px-5 py-3.5 flex gap-3">
                <UserHoverCard user={e.actor} side="right" align="start">
                  <Avatar name={e.actor?.name ?? "?"} size="sm" />
                </UserHoverCard>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">
                      {e.actor?.name ?? "Someone"}
                    </span>{" "}
                    <span className="text-muted">{humanAction(e.action)}</span>
                    {e.details && (
                      <span className="text-foreground"> — {e.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(e.created_at, dateFormat, timeFormat)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function humanAction(a: string) {
  return (
    {
      "member.added": "added a member",
      "member.removed": "removed a member",
      "member.role_changed": "changed a role",
      "status.created": "added a status",
      "status.deleted": "removed a status",
      "version.released": "released a version",
      "webhook.created": "added a webhook",
    }[a] ?? a.replace(".", " ")
  );
}

function BoardsTab({ projectId }: { projectId: string }) {
  const { data: boards = [] } = useBoards(projectId);
  const create = useCreateBoard(projectId);
  const update = useUpdateBoard(projectId);
  const remove = useDeleteBoard(projectId);
  const [draftName, setDraftName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) return;
    await create.mutateAsync({ name: draftName.trim(), filter: "{}" });
    setDraftName("");
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <div className="surface-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Add board
        </h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            required
            placeholder="Board name (e.g. Frontend Kanban)"
            className="input flex-1"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={create.isPending}>
            Add board
          </Button>
        </form>
      </div>

      <div className="surface-card overflow-hidden">
        {boards.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                />
              </svg>
            }
            message="No boards yet. Add one to create a saved Kanban view."
          />
        ) : (
          <ul className="divide-y divide-border">
            {boards.map((b) => (
              <BoardRow
                key={b.id}
                projectId={projectId}
                board={b}
                onRename={(name) =>
                  update.mutate({ id: b.id, name, filter: b.filter })
                }
                onFilter={(filter) =>
                  update.mutate({ id: b.id, name: b.name, filter })
                }
                onDelete={async () => {
                  if (
                    await showConfirm({
                      message: `Delete board "${b.name}"?`,
                      variant: "danger",
                    })
                  )
                    remove.mutate(b.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BoardRow({
  projectId,
  board,
  onRename,
  onFilter,
  onDelete,
}: {
  projectId: string;
  board: Board;
  onRename: (name: string) => void;
  onFilter: (filter: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [showFilter, setShowFilter] = useState(false);

  let parsed: BacklogFilterState = {};
  try {
    parsed = JSON.parse(board.filter || "{}");
  } catch {
    /* ignore */
  }

  const summary: string[] = [];
  if (parsed.types?.length) summary.push(`type: ${parsed.types.join(", ")}`);
  if (parsed.priorities?.length)
    summary.push(`priority: ${parsed.priorities.join(", ")}`);
  if (parsed.assignee_ids?.length)
    summary.push(`${parsed.assignee_ids.length} assignees`);
  if (parsed.label_ids?.length)
    summary.push(`${parsed.label_ids.length} labels`);
  if (parsed.q) summary.push(`text: "${parsed.q}"`);

  function save() {
    setEditing(false);
    if (name.trim() && name !== board.name) onRename(name.trim());
  }

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="input py-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-foreground hover:text-brand transition-colors text-left truncate"
            >
              {board.name}
            </button>
          )}
          <p className="text-xs text-muted mt-0.5">
            {summary.length > 0 ? summary.join(" · ") : "No filter applied"}
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/boards/${board.id}`}
          className="text-xs text-brand hover:text-brand-strong font-medium transition-colors"
        >
          Open
        </Link>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          {showFilter ? "Hide filter" : "Edit filter"}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-[var(--danger)] hover:opacity-70 transition-opacity"
        >
          Remove
        </button>
      </div>
      {showFilter && (
        <BoardFilterEditor
          value={parsed}
          onChange={(v) => onFilter(JSON.stringify(v))}
        />
      )}
    </li>
  );
}

function BoardFilterEditor({
  value,
  onChange,
}: {
  value: BacklogFilterState;
  onChange: (v: BacklogFilterState) => void;
}) {
  const TYPES: IssueType[] = ["task", "bug", "story", "epic"];
  const PRIORITIES: IssuePriority[] = ["low", "medium", "high", "urgent"];

  function toggle<T extends string>(
    arr: readonly T[] | undefined,
    item: T,
  ): T[] {
    const set = new Set(arr ?? []);
    set.has(item) ? set.delete(item) : set.add(item);
    return Array.from(set);
  }

  return (
    <div className="mt-3 p-3.5 bg-surface-2 rounded-xl text-xs space-y-2.5 border border-border">
      <FilterChipRow
        label="Types"
        items={TYPES}
        active={value.types ?? []}
        onToggle={(t) => onChange({ ...value, types: toggle(value.types, t) })}
      />
      <FilterChipRow
        label="Priority"
        items={PRIORITIES}
        active={value.priorities ?? []}
        onToggle={(p) =>
          onChange({ ...value, priorities: toggle(value.priorities, p) })
        }
      />
      <div className="flex items-center gap-2">
        <span className="text-muted w-14 shrink-0">Text</span>
        <input
          placeholder="match in title / description"
          className="input py-1 text-xs flex-1"
          value={value.q ?? ""}
          onChange={(e) =>
            onChange({ ...value, q: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}

function FilterChipRow<T extends string>({
  label,
  items,
  active,
  onToggle,
}: {
  label: string;
  items: readonly T[];
  active: readonly T[];
  onToggle: (item: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-muted w-14 shrink-0">{label}</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onToggle(item)}
          className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all capitalize ${
            active.includes(item)
              ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function WorkflowTab({ projectId }: { projectId: string }) {
  const can = usePermissionsStore((s) => s.can);
  const { data: statuses = [] } = useStatuses(projectId);
  const create = useCreateStatus(projectId);
  const update = useUpdateStatus(projectId);
  const remove = useDeleteStatus(projectId);
  const reorder = useReorderStatuses(projectId);
  const [draft, setDraft] = useState<{
    name: string;
    category: StatusCategory;
    color: string;
  }>({ name: "", category: "todo", color: STATUS_COLORS[0] });
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = draft.name.trim();
    if (!name) return;
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9_ -]/g, "")
      .replace(/[ -]+/g, "_");
    try {
      await create.mutateAsync({
        key,
        name,
        category: draft.category,
        color: draft.color,
      });
      setDraft({ name: "", category: "todo", color: STATUS_COLORS[0] });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to add status");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = statuses.findIndex((s) => s.id === Number(e.active.id));
    const to = statuses.findIndex((s) => s.id === Number(e.over!.id));
    if (from < 0 || to < 0) return;
    const next = [...statuses];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((s) => s.id));
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      {can("workflow.edit") && (
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Add status
          </h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                required
                placeholder="Status name (e.g. Blocked)"
                className="input flex-1 min-w-[200px]"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
              <Select
                value={draft.category}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, category: v as StatusCategory }))
                }
              >
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <ColorPicker
                value={draft.color}
                onChange={(c) => setDraft((d) => ({ ...d, color: c }))}
              />
              <Button type="submit" size="sm" disabled={create.isPending}>
                Add
              </Button>
            </div>
            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          </form>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {statuses.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
            }
            message="No statuses configured."
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={statuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border">
                {statuses.map((s) => (
                  <StatusRow
                    key={s.id}
                    s={s}
                    onRename={(name) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name,
                        category: s.category,
                        color: s.color,
                      })
                    }
                    onColor={(c) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name: s.name,
                        category: s.category,
                        color: c,
                      })
                    }
                    onCategory={(category) =>
                      update.mutate({
                        id: s.id,
                        key: s.key,
                        name: s.name,
                        category,
                        color: s.color,
                      })
                    }
                    onDelete={async () => {
                      if (
                        !(await showConfirm({
                          message: `Delete status "${s.name}"?`,
                          variant: "danger",
                        }))
                      )
                        return;
                      remove.mutate(s.id);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  s,
  onRename,
  onColor,
  onCategory,
  onDelete,
}: {
  s: StatusDefinition;
  onRename: (name: string) => void;
  onColor: (c: string) => void;
  onCategory: (c: StatusCategory) => void;
  onDelete: () => void;
}) {
  const can = usePermissionsStore((s) => s.can);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);

  function save() {
    setEditing(false);
    if (name.trim() && name !== s.name) onRename(name.trim());
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="px-5 py-3 flex items-center gap-3 bg-surface"
    >
      {can("workflow.edit") && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
      )}
      <span
        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white dark:ring-surface"
        style={{ backgroundColor: s.color || "#94a3b8" }}
      />
      <div className="flex-1 min-w-0">
        {can("workflow.edit") && editing ? (
          <input
            autoFocus
            className="input py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            onClick={() => can("workflow.edit") && setEditing(true)}
            className={`text-sm font-medium text-foreground text-left truncate ${
              can("workflow.edit") ? "hover:text-brand transition-colors" : ""
            }`}
          >
            {s.name}
          </button>
        )}
        <p className="text-[10px] font-mono text-muted truncate mt-0.5">
          {s.key}
        </p>
      </div>
      {can("workflow.edit") ? (
        <div className="flex items-center gap-2">
          <ColorPicker value={s.color ?? "#94a3b8"} onChange={onColor} />
          <Select
            value={s.category}
            onValueChange={(v) => onCategory(v as StatusCategory)}
          >
            <SelectTrigger className="w-auto !text-xs !py-1 min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={onDelete}
            className="text-xs text-[var(--danger)] hover:opacity-70 transition-opacity"
          >
            Remove
          </button>
        </div>
      ) : (
        <CategoryBadge category={s.category} />
      )}
    </li>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {STATUS_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-110 ${
            value === c
              ? "border-foreground ring-1 ring-offset-1 ring-foreground/20"
              : "border-transparent"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function WebhooksTab({ projectId }: { projectId: string }) {
  const { data: hooks = [] } = useWebhooks(projectId);
  const create = useCreateWebhook(projectId);
  const update = useUpdateWebhook(projectId);
  const remove = useDeleteWebhook(projectId);
  const [draft, setDraft] = useState<{
    url: string;
    events: WebhookEvent[];
  }>({ url: "", events: ["issue.created", "issue.updated"] });
  const [newSecret, setNewSecret] = useState<string | null>(null);

  function toggleEvent(e: WebhookEvent) {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(e)
        ? d.events.filter((x) => x !== e)
        : [...d.events, e],
    }));
  }

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft.url.trim() || draft.events.length === 0) return;
    const created = await create.mutateAsync({
      url: draft.url.trim(),
      events: draft.events,
    });
    setDraft({ url: "", events: ["issue.created", "issue.updated"] });
    if (created.secret) setNewSecret(created.secret);
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Add webhook
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            required
            type="url"
            placeholder="https://example.com/jifa-webhook"
            className="input"
            value={draft.url}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          />
          <div>
            <p className="text-xs text-muted mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {ALL_WEBHOOK_EVENTS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEvent(e)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    draft.events.includes(e)
                      ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!draft.url.trim() || draft.events.length === 0}
            >
              Add webhook
            </Button>
          </div>
        </form>
      </div>

      {newSecret && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
          <div className="flex items-start gap-2.5">
            <svg
              className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-2">
                Webhook secret — save it now, you won&apos;t see it again
              </p>
              <code className="block bg-surface border border-border rounded-lg px-3 py-2 text-xs break-all font-mono text-foreground">
                {newSecret}
              </code>
            </div>
          </div>
          <button
            onClick={() => setNewSecret(null)}
            className="text-xs text-muted hover:text-foreground transition-colors mt-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {hooks.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
            }
            message="No webhooks yet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {hooks.map((h) => (
              <WebhookRow
                key={h.id}
                hook={h}
                onToggle={() =>
                  update.mutate({
                    id: h.id,
                    url: h.url,
                    events: h.events_list,
                    active: !h.active,
                  })
                }
                onDelete={async () => {
                  if (
                    await showConfirm({
                      message: `Delete webhook to ${h.url}?`,
                      variant: "danger",
                    })
                  )
                    remove.mutate(h.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WebhookRow({
  hook,
  onToggle,
  onDelete,
}: {
  hook: Webhook;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="px-5 py-3.5 flex items-center gap-3">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          hook.active ? "bg-[var(--success)]" : "bg-surface-3"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-mono text-foreground truncate"
          title={hook.url}
        >
          {hook.url}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {hook.events_list.join(", ") || "—"}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
          hook.active
            ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]"
            : "bg-surface-2 text-muted border-border hover:text-foreground"
        }`}
      >
        {hook.active ? "Active" : "Paused"}
      </button>
      <button
        onClick={onDelete}
        className="text-xs text-[var(--danger)] hover:opacity-70 transition-opacity"
      >
        Remove
      </button>
    </li>
  );
}

function DateFormatSection({
  project,
  projectId,
}: {
  project: Project | undefined;
  projectId: string;
}) {
  const update = useUpdateProject();
  const now = new Date();

  function setFmt(field: "date_format" | "time_format", value: string) {
    update.mutate({ id: projectId, [field]: value });
  }

  return (
    <div className="surface-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Date & time format
      </h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Date format
          </label>
          <Select
            value={project?.date_format ?? "MMM DD, YYYY"}
            onValueChange={(v) => setFmt("date_format", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted mt-1.5">
            Preview:{" "}
            <span className="text-foreground font-medium">
              {fmt(now, project?.date_format ?? "MMM DD, YYYY")}
            </span>
          </p>
        </div>
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Time format
          </label>
          <Select
            value={project?.time_format ?? "h:mm A"}
            onValueChange={(v) => setFmt("time_format", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted mt-1.5">
            Preview:{" "}
            <span className="text-foreground font-medium">
              {fmtTime(now, project?.time_format ?? "h:mm A")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ImportExportSection({ projectId }: { projectId: string }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  async function downloadCsv() {
    const res = await api.get(`/projects/${projectId}/export/issues.csv`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "issues.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function uploadCsv(file: File) {
    setImporting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/projects/${projectId}/import/issues`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["issues"] });
    } catch (err: any) {
      setResult({
        created: 0,
        errors: [err.response?.data?.error ?? String(err)],
      });
    } finally {
      setImporting(false);
    }
  }

  const CSV_COLS = [
    "type",
    "status",
    "priority",
    "story_points",
    "start_date",
    "due_date",
    "assignee_email",
    "sprint",
    "version",
    "epic",
    "labels",
    "components",
    "description",
  ];

  return (
    <div className="surface-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Import / Export
      </h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant="secondary" onClick={downloadCsv}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Export issues CSV
        </Button>
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zM6.293 6.707a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1-1.414 1.414L11 5.414V13a1 1 0 1 1-2 0V5.414L7.707 6.707a1 1 0 0 1-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {importing ? "Importing…" : "Import from CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) uploadCsv(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Required:{" "}
        <code className="font-mono bg-surface-2 px-1 rounded">title</code>.{" "}
        Optional:{" "}
        {CSV_COLS.map((col, i) => (
          <span key={col}>
            <code className="font-mono bg-surface-2 px-1 rounded">{col}</code>
            {i < CSV_COLS.length - 1 ? ", " : ". "}
          </span>
        ))}
        Dates: ISO (YYYY-MM-DD). Labels and components are comma-separated.
      </p>
      {result && (
        <div
          className={`mt-3 text-sm rounded-xl p-3.5 border ${
            result.errors.length
              ? "bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] border-[color-mix(in_srgb,var(--warning)_25%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--success)_8%,transparent)] border-[color-mix(in_srgb,var(--success)_25%,transparent)]"
          }`}
        >
          <p className="font-medium text-foreground mb-1">
            Imported {result.created} issue
            {result.created === 1 ? "" : "s"}.
          </p>
          {result.errors.length > 0 && (
            <ul className="list-disc list-inside text-xs text-muted max-h-40 overflow-auto space-y-0.5 mt-1">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentsTab({ projectId }: { projectId: string }) {
  const can = usePermissionsStore((s) => s.can);
  const { data: components = [] } = useComponents(projectId);
  const { data: users = [] } = useUsers();
  const create = useCreateComponent(projectId);
  const update = useUpdateComponent(projectId);
  const remove = useDeleteComponent(projectId);
  const reorder = useReorderComponents(projectId);

  const [draft, setDraft] = useState<{ name: string; lead_id: string }>({
    name: "",
    lead_id: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = components.findIndex((c) => c.id === Number(e.active.id));
    const to = components.findIndex((c) => c.id === Number(e.over!.id));
    if (from < 0 || to < 0) return;
    const next = [...components];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((c) => c.id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await create.mutateAsync({
      name: draft.name.trim(),
      lead_id: draft.lead_id ? Number(draft.lead_id) : undefined,
    });
    setDraft({ name: "", lead_id: "" });
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      {can("component.create") && (
      <div className="surface-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Add component
        </h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            required
            placeholder="Component name"
            className="input flex-1"
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => ({ ...d, name: e.target.value }))
            }
          />
          <Select
            value={draft.lead_id || "__none__"}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, lead_id: v === "__none__" ? "" : v }))
            }
          >
            <SelectTrigger className="w-auto min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No lead</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={create.isPending}>
            Add
          </Button>
        </form>
      </div>
      )}

      <div className="surface-card overflow-hidden">
        {components.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 7.5l-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
            }
            message="No components yet."
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border">
                {components.map((c) => (
                  <ComponentRow
                    key={c.id}
                    c={c}
                    users={users}
                    canEdit={can("component.edit")}
                    canDelete={can("component.delete")}
                    onRename={(name) => update.mutate({ id: c.id, name })}
                    onLead={(leadId) =>
                      update.mutate({ id: c.id, name: c.name, lead_id: leadId })
                    }
                    onDelete={async () => {
                      if (
                        await showConfirm({
                          message: `Delete component "${c.name}"?`,
                          variant: "danger",
                        })
                      )
                        remove.mutate(c.id);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function ComponentRow({
  c,
  users,
  canEdit,
  canDelete,
  onRename,
  onLead,
  onDelete,
}: {
  c: Component;
  users: { id: number; name: string }[];
  canEdit?: boolean;
  canDelete?: boolean;
  onRename: (name: string) => void;
  onLead: (leadId: number | undefined) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: c.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);

  function save() {
    setEditing(false);
    if (name.trim() && name !== c.name) onRename(name.trim());
  }

  const lead = users.find((u) => u.id === c.lead_id);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="px-5 py-3.5 flex items-center gap-3 bg-surface"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        {canEdit && editing ? (
          <input
            autoFocus
            className="input py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            onClick={() => canEdit && setEditing(true)}
            className={`text-sm font-medium text-left truncate ${
              canEdit
                ? "text-foreground hover:text-brand transition-colors"
                : "text-muted"
            }`}
          >
            {c.name}
          </button>
        )}
        {lead && !editing && (
          <p className="text-xs text-muted mt-0.5">Lead: {lead.name}</p>
        )}
      </div>
      {canEdit && (
        <Select
          value={c.lead_id != null ? String(c.lead_id) : "__none__"}
          onValueChange={(v) => onLead(v === "__none__" ? undefined : Number(v))}
        >
          <SelectTrigger className="w-auto !text-xs !py-1 min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No lead</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="text-xs text-[var(--danger)] hover:opacity-70 transition-opacity"
        >
          Remove
        </button>
      )}
    </li>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function save() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
  }

  return (
    <div className="flex gap-4 text-sm items-start">
      <dt className="w-24 shrink-0 text-muted pt-1">{label}</dt>
      <dd className="text-foreground font-medium flex-1 min-w-0">
        {editing ? (
          multiline ? (
            <textarea
              autoFocus
              className="input py-1.5 text-sm w-full resize-y min-h-[60px]"
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                className="input py-1 text-sm flex-1"
                placeholder={placeholder}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
            </div>
          )
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="hover:text-brand transition-colors text-left truncate max-w-full"
          >
            {value || <span className="text-muted">—</span>}
          </button>
        )}
      </dd>
    </div>
  );
}

function PermissionsTab({
  projectId,
  permissions,
  roles,
}: {
  projectId: string;
  permissions: Permission[];
  roles: Role[];
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [newRoleDraft, setNewRoleDraft] = useState<string>("");
  const [rolePermsMap, setRolePermsMap] = useState<Record<number, string[]>>(
    {},
  );
  const createRole = useCreateRole(projectId);
  const deleteRole = useDeleteRole(projectId);
  const setRolePerms = useSetRolePermissions(projectId);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  const handlePermsLoaded = useCallback((roleId: number, keys: string[]) => {
    setRolePermsMap((prev) => ({ ...prev, [roleId]: keys }));
  }, []);

  async function handleCreate() {
    if (!newRoleDraft.trim()) return;
    try {
      await createRole.mutateAsync({ name: newRoleDraft.trim() });
      setNewRoleDraft("");
    } catch {}
  }

  async function handleDelete(role: Role) {
    if (
      !(await showConfirm({
        message: `Delete role "${role.name}"?`,
        variant: "danger",
      }))
    )
      return;
    if (selectedRoleId === role.id) setSelectedRoleId(null);
    deleteRole.mutate(role.id);
  }

  function renderRolePermBadge(role: Role) {
    const count = rolePermsMap[role.id]?.length;
    if (count !== undefined) {
      return (
        <span className="shrink-0 ml-auto px-1.5 py-0.5 rounded text-[11px] font-mono bg-surface-2 text-muted border border-border">
          {count}
        </span>
      );
    }
    return (
      <span className="shrink-0 ml-auto px-1.5 py-0.5 rounded text-[11px] font-mono text-muted/30">
        —
      </span>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-[300px_1fr] gap-6 items-start">
        {/* ── Left: Role list ── */}
        <div className="surface-card divide-y divide-border overflow-hidden rounded-xl border border-border shadow-sm max-h-[calc(100vh-12rem)] flex flex-col">
          <div className="overflow-y-auto flex-1">
            {/* Section: System roles */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-1.5 mb-3">
                <svg
                  className="w-3.5 h-3.5 text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  System Roles
                </h3>
                <span className="ml-auto text-xs font-mono text-muted/50">
                  {systemRoles.length}
                </span>
              </div>
              <div className="space-y-1">
                {systemRoles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedRoleId === r.id
                        ? "bg-[var(--brand-soft)] text-brand ring-1 ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
                        : "text-foreground hover:bg-surface-2 ring-1 ring-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 shrink-0 ${selectedRoleId === r.id ? "text-brand" : "text-muted"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="font-medium truncate flex-1">
                        {r.name}
                      </span>
                      {renderRolePermBadge(r)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        <svg
                          className="w-2.5 h-2.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        System
                      </span>
                      <span className="text-xs text-muted">Predefined</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Custom roles */}
            <div className="p-4 pt-3">
              <div className="flex items-center gap-1.5 mb-3">
                <svg
                  className="w-3.5 h-3.5 text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Custom Roles
                </h3>
                <span className="ml-auto text-xs font-mono text-muted/50">
                  {customRoles.length}
                </span>
              </div>
              <div className="space-y-1">
                {customRoles.map((r) => (
                  <div
                    key={r.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                      selectedRoleId === r.id
                        ? "bg-[var(--brand-soft)] text-brand ring-1 ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
                        : "text-foreground hover:bg-surface-2 ring-1 ring-transparent"
                    }`}
                    onClick={() => setSelectedRoleId(r.id)}
                  >
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 ${selectedRoleId === r.id ? "text-brand" : "text-muted"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="font-medium truncate flex-1">
                      {r.name}
                    </span>
                    {renderRolePermBadge(r)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r);
                      }}
                      className="shrink-0 p-1 rounded text-muted/30 hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete role"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Create role */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    placeholder="New role name"
                    className="input py-1.5 text-sm flex-1 h-9"
                    value={newRoleDraft}
                    onChange={(e) => setNewRoleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!newRoleDraft.trim() || createRole.isPending}
                    onClick={handleCreate}
                  >
                    {createRole.isPending ? (
                      <svg
                        className="w-3 h-3 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                    {createRole.isPending ? "Adding…" : "Add role"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Permission editor ── */}
        <div className="min-h-[300px]">
          {selectedRole ? (
            <RolePermissionEditor
              key={selectedRoleId}
              role={selectedRole}
              projectId={projectId}
              permissions={permissions}
              setRolePerms={setRolePerms}
              onPermsLoaded={handlePermsLoaded}
              onDelete={() => handleDelete(selectedRole)}
            />
          ) : (
            <div className="surface-card h-full flex items-center justify-center min-h-[300px] rounded-xl border border-border shadow-sm">
              <EmptyState
                icon={
                  <svg
                    className="w-12 h-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    <circle
                      cx="12"
                      cy="16"
                      r="1"
                      fill="currentColor"
                      opacity="0.3"
                    />
                  </svg>
                }
                message="Select a role from the sidebar to view and configure its permissions."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RolePermissionEditor({
  role,
  projectId,
  permissions,
  setRolePerms,
  onPermsLoaded,
  onDelete,
}: {
  role: Role;
  projectId: string;
  permissions: Permission[];
  setRolePerms: ReturnType<typeof useSetRolePermissions>;
  onPermsLoaded: (roleId: number, keys: string[]) => void;
  onDelete: () => void;
}) {
  const { data: assignedKeys = [], isLoading: permLoading } =
    useRolePermissions(projectId, role.id);

  const [added, setAdded] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(role.name);

  const safePerms = permissions ?? [];
  const groups = Array.from(new Set(safePerms.map((p) => p.group)));
  const grouped = groups.map((g) => ({
    key: g,
    label: g.charAt(0).toUpperCase() + g.slice(1),
    perms: safePerms.filter((p) => p.group === g),
  }));

  const readOnly = role.is_system;
  const hasChanges = added.size > 0 || removed.size > 0;

  const updateRole = useUpdateRole(projectId, role.id);

  const onPermsLoadedRef = useRef(onPermsLoaded);

  useEffect(() => {
    onPermsLoadedRef.current = onPermsLoaded;
  }, [onPermsLoaded]);

  useEffect(() => {
    if (!permLoading) {
      onPermsLoadedRef.current(role.id, assignedKeys);
    }
  }, [assignedKeys, permLoading, role.id]);

  function isChecked(key: string) {
    if (removed.has(key)) return false;
    if (added.has(key)) return true;
    return assignedKeys.includes(key);
  }

  function toggle(key: string) {
    if (readOnly) return;
    if (isChecked(key)) {
      setRemoved((prev) => new Set(prev).add(key));
      setAdded((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    } else {
      setAdded((prev) => new Set(prev).add(key));
      setRemoved((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  }

  function toggleGroup(groupPerms: typeof safePerms) {
    if (readOnly) return;
    const allChecked = groupPerms.every((p) => isChecked(p.key));
    if (allChecked) {
      const toRemove = groupPerms.filter((p) => isChecked(p.key));
      setRemoved((prev) => new Set([...prev, ...toRemove.map((p) => p.key)]));
      setAdded((prev) => {
        const n = new Set(prev);
        groupPerms.forEach((p) => n.delete(p.key));
        return n;
      });
    } else {
      const toAdd = groupPerms.filter((p) => !isChecked(p.key));
      const toAddKeys = toAdd.map((p) => p.key);
      setAdded((prev) => new Set([...prev, ...toAddKeys]));
      setRemoved((prev) => {
        const n = new Set(prev);
        toAddKeys.forEach((k) => n.delete(k));
        return n;
      });
    }
  }

  async function handleSave() {
    const finalKeys = [
      ...assignedKeys.filter((k) => !removed.has(k)),
      ...added,
    ];
    try {
      await setRolePerms.mutateAsync({
        roleId: role.id,
        permissions: finalKeys,
      });
      toast("Permissions saved", "success");
      setAdded(new Set());
      setRemoved(new Set());
    } catch {}
  }

  function handleCancel() {
    setAdded(new Set());
    setRemoved(new Set());
  }

  function startRename() {
    setNameDraft(role.name);
    setEditingName(true);
  }

  function cancelRename() {
    setEditingName(false);
    setNameDraft(role.name);
  }

  async function saveRename() {
    if (!nameDraft.trim() || nameDraft.trim() === role.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateRole.mutateAsync({ name: nameDraft.trim() });
      setEditingName(false);
      toast("Role renamed", "success");
    } catch {}
  }

  const filteredGrouped = search.trim()
    ? grouped
        .map((g) => ({
          ...g,
          perms: g.perms.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.key.toLowerCase().includes(search.toLowerCase()) ||
              p.description?.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((g) => g.perms.length > 0)
    : grouped;

  const totalChecked = safePerms.filter((p) => isChecked(p.key)).length;

  if (permLoading) {
    return (
      <div className="surface-card rounded-xl border border-border shadow-sm p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden flex flex-col max-h-[calc(100vh-280px)] rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border shrink-0 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  className="input py-1 text-sm h-7 w-48"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  autoFocus
                />
                <button
                  onClick={saveRename}
                  disabled={!nameDraft.trim() || updateRole.isPending}
                  className="shrink-0 p-1 rounded text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors disabled:opacity-30"
                  title="Save"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  onClick={cancelRename}
                  className="shrink-0 p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  title="Cancel"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <h2 className="text-sm font-semibold text-foreground truncate">
                {role.name}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!readOnly && !editingName && (
              <>
                <button
                  onClick={startRename}
                  className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
                  title="Rename role"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Rename
                </button>
                <span className="text-muted/30">|</span>
                <button
                  onClick={onDelete}
                  className="text-sm text-muted hover:text-[var(--danger)] transition-colors inline-flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete role
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted">
            {readOnly
              ? "System role permissions are predefined and cannot be changed."
              : "Toggle permissions to customize what this role can do."}
          </p>
          <span className="text-xs font-mono text-muted/60 shrink-0 ml-4">
            {totalChecked}/{safePerms.length} permissions
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input pl-8 py-1.5 text-sm h-9 w-full"
            placeholder="Search permissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Read-only banner for system roles */}
      {readOnly && (
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20 shrink-0">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <svg
              className="w-3 h-3 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            This is a system role. All {permissions.length} permissions are
            fixed and cannot be modified.
          </p>
        </div>
      )}

      {/* Permission groups */}
      <div className="overflow-y-auto flex-1">
        <div className="p-5 space-y-5">
          {filteredGrouped.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted">
                No permissions match your search.
              </p>
            </div>
          ) : (
            filteredGrouped.map((g) => {
              const checkedCount = g.perms.filter((p) =>
                isChecked(p.key),
              ).length;
              const allChecked = checkedCount === g.perms.length;
              const someChecked = checkedCount > 0 && !allChecked;
              return (
                <div key={g.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <button
                          onClick={() => toggleGroup(g.perms)}
                          className={`p-0.5 rounded transition-colors ${
                            allChecked
                              ? "text-brand"
                              : someChecked
                                ? "text-brand/70"
                                : "text-muted/40 hover:text-muted"
                          }`}
                          title={allChecked ? "Deselect all" : "Select all"}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {g.label}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-muted">
                      {checkedCount}/{g.perms.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {g.perms.map((p) => {
                      const checked = isChecked(p.key);
                      return (
                        <label
                          key={p.key}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            readOnly
                              ? "cursor-default"
                              : "cursor-pointer hover:bg-surface-2"
                          } ${
                            checked && !readOnly
                              ? "bg-(--brand-soft)/50  rounded-l-sm"
                              : "border-transparent"
                          } ${
                            search &&
                            p.name.toLowerCase().includes(search.toLowerCase())
                              ? "ring-1 ring-(--brand)/20"
                              : ""
                          }`}
                        >
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(p.key)}
                              disabled={permLoading || readOnly}
                              className={`w-3.5 h-3.5 accent-[var(--brand)] ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm transition-colors ${checked ? "text-brand font-semibold" : "text-muted"}`}
                              >
                                {p.name}
                              </span>
                              <code className="text-[11px] font-mono text-muted/40 shrink-0 hidden lg:inline">
                                {p.key}
                              </code>
                            </div>
                            {p.description && (
                              <p
                                className={`text-sm leading-snug mt-0.5 ${checked ? "text-muted" : "text-muted/60"}`}
                              >
                                {p.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between shrink-0 bg-surface-2/30">
          <span className="text-xs text-muted">
            {hasChanges ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-brand">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {added.size} added
                </span>
                <span className="text-muted/40">|</span>
                <span className="inline-flex items-center gap-1 text-[var(--danger)]">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  {removed.size} removed
                </span>
              </span>
            ) : (
              "No changes"
            )}
          </span>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || setRolePerms.isPending}
            >
              {setRolePerms.isPending ? (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-3 h-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving…
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
