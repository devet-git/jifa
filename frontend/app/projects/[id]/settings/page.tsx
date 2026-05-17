"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@/lib/dnd";
import { useDragCursor } from "@/hooks/useDragCursor";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/api";
import {
  useProject,
  useUpdateProject,
  useArchiveProject,
  useUnarchiveProject,
  useDeleteProject,
} from "@/hooks/useProject";
import {
  DATE_FORMATS,
  TIME_FORMATS,
  fmt,
  fmtTime,
  formatDate,
} from "@/lib/formatDate";
import {
  useMembers,
  useProjectUsers,
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
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "@/hooks/useLabels";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhookDraft,
  type WebhookInput,
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
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Spinner } from "@/components/ui/Spinner";
import { Tooltip } from "@/components/ui/Tooltip";
import { UserSearchSelect } from "@/components/ui/UserSearchSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { GitLabSettingsTab } from "@/components/integrations/GitLabSettingsTab";
import { Trash2, X, Users, Settings, GitBranch, LayoutDashboard, Puzzle, Tag, Webhook as WebhookIcon, ClipboardList, Shield, Lock, Plus, Search, Check, Pencil, ArrowLeft, Download, AlertTriangle, List, Upload, GripVertical, ChevronRight } from "lucide-react";
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
  WebhookAuthType,
  WebhookBodyType,
  WebhookEvent,
  WebhookMethod,
  WebhookTestResult,
} from "@/types";

type Tab =
  | "members"
  | "permissions"
  | "workflow"
  | "boards"
  | "components"
  | "labels"
  | "webhooks"
  | "gitlab"
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
  // Issue
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "issue.status_changed",
  "issue.assigned",
  "issue.unassigned",
  "issue.priority_changed",
  "issue.linked",
  "issue.unlinked",
  // Comment
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "comment.mentioned",
  // Sprint
  "sprint.created",
  "sprint.updated",
  "sprint.started",
  "sprint.completed",
  // Version
  "version.created",
  "version.released",
  // Member
  "member.added",
  "member.removed",
  "member.role_changed",
  // Worklog
  "worklog.added",
  "worklog.deleted",
  // Attachment
  "attachment.uploaded",
  // Wiki
  "wiki_page.created",
  "wiki_page.updated",
  "wiki_page.deleted",
  // Wiki comment
  "wiki_comment.created",
  "wiki_comment.updated",
  "wiki_comment.deleted",
  "wiki_comment.mentioned",
  // Project
  "project.updated",
];

const WEBHOOK_EVENT_GROUPS: { label: string; events: WebhookEvent[] }[] = [
  {
    label: "Issue",
    events: [
      "issue.created",
      "issue.updated",
      "issue.deleted",
      "issue.status_changed",
      "issue.assigned",
      "issue.unassigned",
      "issue.priority_changed",
      "issue.linked",
      "issue.unlinked",
    ],
  },
  {
    label: "Comment",
    events: [
      "comment.created",
      "comment.updated",
      "comment.deleted",
      "comment.mentioned",
    ],
  },
  {
    label: "Sprint",
    events: [
      "sprint.created",
      "sprint.updated",
      "sprint.started",
      "sprint.completed",
    ],
  },
  {
    label: "Version",
    events: ["version.created", "version.released"],
  },
  {
    label: "Member",
    events: ["member.added", "member.removed", "member.role_changed"],
  },
  {
    label: "Worklog",
    events: ["worklog.added", "worklog.deleted"],
  },
  {
    label: "Attachment",
    events: ["attachment.uploaded"],
  },
  {
    label: "Wiki",
    events: [
      "wiki_page.created", "wiki_page.updated", "wiki_page.deleted",
      "wiki_comment.created", "wiki_comment.updated",
      "wiki_comment.deleted", "wiki_comment.mentioned",
    ],
  },
  {
    label: "Project",
    events: ["project.updated"],
  },
];

const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  // Issue
  "issue.created":
    "Fires when a new issue is created in this project (any type: task, bug, story, epic).",
  "issue.updated":
    "Fires when an issue is edited — title, description, status, assignee, priority, labels, components, or any other field.",
  "issue.deleted":
    "Fires when an issue is permanently removed from this project.",
  "issue.status_changed":
    "Fires only when an issue's status changes (e.g. To Do → In Progress). Granular alternative to issue.updated.",
  "issue.assigned":
    "Fires when an issue gets a new assignee (or is reassigned to a different person).",
  "issue.unassigned":
    "Fires when an issue's assignee is removed (assignee set to null).",
  "issue.priority_changed":
    "Fires only when an issue's priority value changes (e.g. medium → high).",
  "issue.linked":
    "Fires when two issues are linked (blocks, relates-to, duplicates, etc.).",
  "issue.unlinked":
    "Fires when an existing issue link is removed.",
  // Comment
  "comment.created":
    "Fires when someone posts a new comment on any issue in this project.",
  "comment.updated":
    "Fires when an existing comment's body is edited by its author or an admin.",
  "comment.deleted":
    "Fires when a comment is removed.",
  "comment.mentioned":
    "Fires once per @mention inside a new comment. Payload includes the mentioned user id — useful for routing notifications to specific people.",
  // Sprint
  "sprint.created":
    "Fires when a new sprint is created (still in planning, not yet started).",
  "sprint.updated":
    "Fires when a sprint's name, goal, or dates change.",
  "sprint.started":
    "Fires when an active sprint is started — useful to kick off team workflows.",
  "sprint.completed":
    "Fires when a sprint is closed — issues are moved out and final stats are produced.",
  // Version
  "version.created":
    "Fires when a new version/release is created (still unreleased).",
  "version.released":
    "Fires when a version is marked as released — useful for release-note automation.",
  // Member
  "member.added":
    "Fires when a user is added to this project (including re-adding someone who was previously removed).",
  "member.removed":
    "Fires when a user is removed from the project's member list.",
  "member.role_changed":
    "Fires when a member's role is changed (e.g. Member → Admin).",
  // Worklog
  "worklog.added":
    "Fires when someone logs time on an issue.",
  "worklog.deleted":
    "Fires when a worklog entry is removed.",
  // Attachment
  "attachment.uploaded":
    "Fires when a file is attached to an issue.",
  // Wiki
  "wiki_page.created":
    "Fires when a new wiki page is created in this project.",
  "wiki_page.updated":
    "Fires when a wiki page's title or content is edited.",
  "wiki_page.deleted":
    "Fires when a wiki page is removed.",
  // Wiki comment
  "wiki_comment.created":
    "Fires when someone posts a new comment on any wiki page in this project.",
  "wiki_comment.updated":
    "Fires when an existing wiki comment's body is edited by its author or an admin.",
  "wiki_comment.deleted":
    "Fires when a wiki comment is removed.",
  "wiki_comment.mentioned":
    "Fires once per @mention inside a new wiki comment. Payload includes the mentioned user id.",
  // Project
  "project.updated":
    "Fires when project metadata changes — name, key, description, category, or date/time formats.",
};

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
  // 1) Project identity
  { key: "details", label: "Details", icon: <Settings className="w-3.5 h-3.5" /> },
  // 2) People & access
  { key: "members", label: "Members", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "permissions", label: "Permissions", icon: <Shield className="w-3.5 h-3.5" /> },
  // 3) Work configuration (issue taxonomy → workflow → views)
  { key: "workflow", label: "Workflow", icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: "components", label: "Components", icon: <Puzzle className="w-3.5 h-3.5" /> },
  { key: "labels", label: "Labels", icon: <Tag className="w-3.5 h-3.5" /> },
  { key: "boards", label: "Boards", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  // 4) Integrations & history
  { key: "webhooks", label: "Webhooks", icon: <WebhookIcon className="w-3.5 h-3.5" /> },
  { key: "gitlab", label: "GitLab", icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: "audit", label: "Audit", icon: <ClipboardList className="w-3.5 h-3.5" /> },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<number | "all">("all");

  const memberRoleID = roles.find((r) => r.name === "Member")?.id ?? 0;

  const memberSearchQ = memberSearch.trim().toLowerCase();
  const visibleMembers = members.filter((m) => {
    if (memberRoleFilter !== "all" && m.role_id !== memberRoleFilter) return false;
    if (!memberSearchQ) return true;
    return (
      m.user?.name?.toLowerCase().includes(memberSearchQ) ||
      m.user?.email?.toLowerCase().includes(memberSearchQ)
    );
  });

  const visibleTabs = tabConfig.filter((t) => {
    switch (t.key) {
      case "members":
        return myPermKeys?.includes("member.view");
      case "permissions":
        return myPermKeys?.includes("member.role-change");
      case "workflow":
        return myPermKeys?.includes("workflow.edit");
      case "boards":
        return myPermKeys?.some((k) => k.startsWith("board."));
      case "components":
        return myPermKeys?.some((k) => k.startsWith("component."));
      case "labels":
        return myPermKeys?.includes("issue.edit");
      case "webhooks":
        return myPermKeys?.includes("webhook.manage");
      case "gitlab":
        return myPermKeys?.includes("project.edit");
      case "audit":
        return myPermKeys?.includes("audit.view");
      case "details":
        return myPermKeys?.includes("project.edit");
      default:
        return true;
    }
  });

  // Active tab falls back to the first visible tab when the URL points at a
  // tab the user cannot access (e.g. default "details" for a member without
  // project.edit). Prevents rendering hidden tab content.
  const requestedTab = (searchParams.get("tab") as Tab) ?? "details";
  const activeTab: Tab | undefined = visibleTabs.some((t) => t.key === requestedTab)
    ? requestedTab
    : visibleTabs[0]?.key;

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

  // No settings tab is accessible to this user. Show a friendly empty-state
  // so they understand why the page is blank instead of seeing just a header.
  if (visibleTabs.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-2 pb-3 border-b border-border bg-surface">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to project
            </Link>
            <span className="text-muted/30">/</span>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-muted" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1.5">
              No settings available
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Your role on <span className="font-medium text-foreground">{project?.name}</span>
              {myRole ? <> (<span className="font-medium">{myRole.name}</span>)</> : null}{" "}
              doesn&apos;t grant access to any project settings. Ask a project
              admin if you need to manage members, workflow, webhooks, or other
              configuration.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link
                href={`/projects/${id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-foreground hover:bg-surface-3 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to project
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col h-full min-h-0"
    >
      {/* Header */}
      <div className="px-6 pt-2 pb-0 border-b border-border bg-surface">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to project
          </Link>
          <span className="text-muted/30">/</span>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
        <TabsList className="!bg-transparent !rounded-none !p-0 gap-0 -mb-px overflow-x-auto justify-start w-full">
          {visibleTabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="!rounded-none !bg-transparent !shadow-none inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 border-transparent transition-all whitespace-nowrap data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:!bg-transparent data-[state=active]:!shadow-none hover:border-border"
            >
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-5 overflow-auto min-h-0">
        <TabsContent value="members" className="!mt-0">
          <div className="animate-fade-in">
            <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[1fr_280px]">
              {/* Main: member list */}
              <div className="surface-card overflow-hidden order-2 lg:order-1">
                {visibleMembers.length === 0 ? (
                  <EmptyState
                    icon={<Users className="w-8 h-8" />}
                    message={
                      members.length === 0
                        ? "No members yet."
                        : "No members match the filter."
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {visibleMembers.map((m) => {
                      const isOwner = project?.owner_id === m.user_id;
                      return (
                        <li
                          key={m.id}
                          className="px-5 py-3.5 flex items-center gap-3"
                        >
                          <Avatar
                            name={m.user?.name}
                            src={m.user?.avatar}
                            size="md"
                          />
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
                            <Tooltip content="Remove member">
                              <button
                                onClick={async () => {
                                  if (
                                    await showConfirm({
                                      message: "Remove this member?",
                                    })
                                  )
                                    removeMember.mutate(m.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Side: filter + search + add (sticky) */}
              <aside className="order-1 lg:order-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3 pb-2">
                <div className="surface-card p-3 space-y-2">
                  <Select
                    value={String(memberRoleFilter)}
                    onValueChange={(v) =>
                      setMemberRoleFilter(v === "all" ? "all" : Number(v))
                    }
                  >
                    <SelectTrigger className="w-full h-8 !text-sm">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All roles ({members.length})
                      </SelectItem>
                      {roles.map((r) => {
                        const count = members.filter(
                          (m) => m.role_id === r.id,
                        ).length;
                        return (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                    <input
                      placeholder="Search by name or email"
                      className="input !pl-8 !py-1 !text-sm h-8 w-full"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-muted pt-1">
                    Showing{" "}
                    <span className="font-mono text-foreground">
                      {visibleMembers.length}
                    </span>
                    {(memberRoleFilter !== "all" || memberSearchQ) && (
                      <>
                        {" "}of{" "}
                        <span className="font-mono">{members.length}</span>
                      </>
                    )}
                    {" "}
                    {visibleMembers.length === 1 ? "member" : "members"}
                  </p>
                </div>

                {canManageMembers && (
                  <div className="surface-card p-4">
                    <form onSubmit={handleAdd} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1.5">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="user@example.com"
                          className="input w-full h-9"
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted block mb-1.5">
                          Role
                        </label>
                        <Select
                          value={String(form.role_id)}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, role_id: Number(v) }))
                          }
                        >
                          <SelectTrigger className="w-full h-9">
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
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addMember.isPending || !form.email.trim()}
                        className="w-full h-9"
                      >
                        {addMember.isPending ? (
                          <>
                            <Spinner className="w-3 h-3" />
                            Adding…
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add member
                          </>
                        )}
                      </Button>
                      {error && (
                        <p className="text-xs text-[var(--danger)]">{error}</p>
                      )}
                    </form>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="components" className="!mt-0">
          <ComponentsTab projectId={id} />
        </TabsContent>
        <TabsContent value="labels" className="!mt-0">
          <LabelsTab projectId={id} />
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
        <TabsContent value="gitlab" className="!mt-0">
          <GitLabSettingsTab projectId={id} />
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
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-start animate-fade-in">
            <div className="surface-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Project details
              </h2>
              <dl className="space-y-2.5">
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
                  label="Category"
                  value={project?.category ?? ""}
                  placeholder="e.g. Engineering, Marketing"
                  onSave={(v) =>
                    update.mutate({ id, category: v || undefined })
                  }
                />
                <EditableField
                  label="Description"
                  value={project?.description ?? ""}
                  placeholder="Project description"
                  multiline
                  onSave={(v) => update.mutate({ id, description: v })}
                />
              </dl>
            </div>
            <div className="space-y-4">
              <DateFormatSection project={project} projectId={id} />
              <ImportExportSection projectId={id} />
            </div>
          </div>
          <div className="mt-4">
            <DangerZone project={project} projectId={id} />
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

function DangerZone({
  project,
  projectId,
}: {
  project: Project | undefined;
  projectId: string;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const archive = useArchiveProject();
  const unarchive = useUnarchiveProject();
  const del = useDeleteProject();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  if (!project) return null;
  const isOwner = user?.id === project.owner_id;
  const isArchived = !!project.archived_at;

  async function handleArchive() {
    if (
      !(await showConfirm({
        title: "Archive project?",
        message:
          "Members will no longer be able to create or edit anything in this project. You can restore it later from the same page.",
        confirmLabel: "Archive",
        variant: "primary",
      }))
    )
      return;
    try {
      await archive.mutateAsync(projectId);
      toast("Project archived", "success");
    } catch {}
  }

  async function handleUnarchive() {
    try {
      await unarchive.mutateAsync(projectId);
      toast("Project restored", "success");
    } catch {}
  }

  async function handleDelete() {
    if (confirmName.trim() !== project!.name) return;
    try {
      await del.mutateAsync({ id: projectId, confirm: confirmName.trim() });
      toast("Project deleted", "success");
      router.push("/projects");
    } catch {}
  }

  return (
    <div className="surface-card border-red-500/30 dark:border-red-500/20 p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
          <p className="text-xs text-muted mt-0.5">
            Archive hides this project from active lists and blocks new
            changes. Deletion permanently removes the project and every issue,
            sprint, wiki page, and audit entry — there is no undo.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Archive / Unarchive */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-2/60">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isArchived ? "Restore project" : "Archive project"}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {isArchived
                ? "Make this project active again. Members can resume work."
                : "Reversible. The project becomes read-only for everyone."}
            </p>
          </div>
          {isArchived ? (
            <Button
              size="sm"
              variant="primary"
              onClick={handleUnarchive}
              disabled={unarchive.isPending}
            >
              {unarchive.isPending ? "Restoring…" : "Unarchive"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleArchive}
              disabled={archive.isPending}
            >
              {archive.isPending ? "Archiving…" : "Archive"}
            </Button>
          )}
        </div>

        {/* Delete (owner only) */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-500/[0.04]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Delete project
            </p>
            <p className="text-xs text-muted mt-0.5">
              {isOwner
                ? "Permanently destroys the project. Requires typing the project name to confirm."
                : "Only the project owner can delete this project."}
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirmName("");
              setShowDelete(true);
            }}
            disabled={!isOwner}
          >
            Delete…
          </Button>
        </div>
      </div>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete project permanently?"
        size="md"
      >
        <div className="space-y-3 text-sm">
          <p className="text-foreground">
            This will permanently delete{" "}
            <span className="font-semibold">{project.name}</span> and every
            issue, sprint, wiki page, attachment, and audit record attached to
            it. <span className="text-red-500 font-medium">This cannot be undone.</span>
          </p>
          <p className="text-muted">
            Type{" "}
            <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-foreground">
              {project.name}
            </code>{" "}
            to confirm.
          </p>
          <input
            autoFocus
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            className="input"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDelete(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDelete}
              disabled={
                confirmName.trim() !== project.name || del.isPending
              }
            >
              {del.isPending ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
        </div>
      </Modal>
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
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
        <Button size="sm" variant="secondary" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
      <div className="surface-card overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            icon={
              <ClipboardList className="w-8 h-8" />
            }
            message="No audit entries yet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="px-5 py-3.5 flex gap-3">
                <Avatar
                  name={e.actor?.name ?? "?"}
                  src={e.actor?.avatar}
                  size="sm"
                />
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
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();
  const focusBoardId = searchParams.get("board");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) return;
    await create.mutateAsync({ name: draftName.trim(), filter: "{}" });
    setDraftName("");
  }

  const q = search.trim().toLowerCase();
  const visible = q
    ? boards.filter((b) => b.name.toLowerCase().includes(q))
    : boards;

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Main: board list */}
        <div className="surface-card overflow-hidden order-2 lg:order-1">
          {visible.length === 0 ? (
            <EmptyState
              icon={<LayoutDashboard className="w-8 h-8" />}
              message={
                boards.length === 0
                  ? "No boards yet. Add one to create a saved Kanban view."
                  : "No boards match your search."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((b) => (
                <BoardRow
                  key={b.id}
                  projectId={projectId}
                  board={b}
                  focused={String(b.id) === focusBoardId}
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

        {/* Side: search + add (sticky) */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3 pb-2">
          <div className="surface-card p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                placeholder="Search boards"
                className="input !pl-8 !py-1 !text-sm h-8 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted pt-1">
              Showing{" "}
              <span className="font-mono text-foreground">{visible.length}</span>
              {q && (
                <>
                  {" "}of <span className="font-mono">{boards.length}</span>
                </>
              )}
              {" "}
              {visible.length === 1 ? "board" : "boards"}
            </p>
          </div>

          <div className="surface-card p-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted block mb-1.5">
                  Name
                </label>
                <input
                  required
                  placeholder="e.g. Frontend Kanban"
                  className="input w-full h-9"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={create.isPending || !draftName.trim()}
                className="w-full h-9"
              >
                {create.isPending ? (
                  <>
                    <Spinner className="w-3 h-3" />
                    Adding…
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Add board
                  </>
                )}
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BoardRow({
  projectId,
  board,
  focused,
  onRename,
  onFilter,
  onDelete,
}: {
  projectId: string;
  board: Board;
  focused?: boolean;
  onRename: (name: string) => void;
  onFilter: (filter: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [showFilter, setShowFilter] = useState(!!focused);
  const rowRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (focused && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focused]);

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
    <li
      id={`board-row-${board.id}`}
      ref={rowRef}
      className={`px-5 py-3.5 transition-colors ${
        focused ? "bg-brand/5 ring-1 ring-inset ring-brand/30" : ""
      }`}
    >
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
        <Tooltip content="Remove board">
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
      {showFilter && (
        <BoardFilterEditor
          projectId={projectId}
          value={parsed}
          onChange={(v) => onFilter(JSON.stringify(v))}
        />
      )}
    </li>
  );
}

function BoardFilterEditor({
  projectId,
  value,
  onChange,
}: {
  projectId: string;
  value: BacklogFilterState;
  onChange: (v: BacklogFilterState) => void;
}) {
  const TYPES: IssueType[] = ["task", "bug", "story", "epic"];
  const PRIORITIES: IssuePriority[] = ["low", "medium", "high", "urgent"];
  const { data: users = [] } = useProjectUsers(projectId);
  const { data: labels = [] } = useLabels(projectId);

  function toggle<T extends string>(
    arr: readonly T[] | undefined,
    item: T,
  ): T[] {
    const set = new Set(arr ?? []);
    set.has(item) ? set.delete(item) : set.add(item);
    return Array.from(set);
  }

  function toggleNum(arr: readonly number[] | undefined, item: number): number[] {
    const set = new Set(arr ?? []);
    set.has(item) ? set.delete(item) : set.add(item);
    return Array.from(set);
  }

  const [textDraft, setTextDraft] = useState(value.q ?? "");
  useEffect(() => {
    setTextDraft(value.q ?? "");
  }, [value.q]);

  function commitText() {
    const next = textDraft.trim() || undefined;
    if (next === (value.q ?? undefined)) return;
    onChange({ ...value, q: next });
  }

  const activeFilterCount =
    (value.types?.length ?? 0) +
    (value.priorities?.length ?? 0) +
    (value.assignee_ids?.length ?? 0) +
    (value.label_ids?.length ?? 0) +
    (value.q ? 1 : 0);

  return (
    <div className="mt-3 p-4 bg-surface-2/60 rounded-xl text-xs space-y-3 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Edit filter
        </span>
        {activeFilterCount > 0 && (
          <button
            onClick={() => onChange({})}
            className="text-[11px] text-muted hover:text-[var(--danger)] inline-flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <FilterChipRow
        label="Type"
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

      {/* Assignees */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-muted w-14 shrink-0 pt-1">Assignee</span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {users.length === 0 ? (
            <span className="text-muted/60 text-[11px] pt-1">No users</span>
          ) : (
            users.map((u) => {
              const active = value.assignee_ids?.includes(u.id) ?? false;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      assignee_ids: toggleNum(value.assignee_ids, u.id),
                    })
                  }
                  className={`inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                    active
                      ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  <Avatar name={u.name ?? u.email} src={u.avatar} size="xs" />
                  <span className="max-w-[120px] truncate">{u.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-muted w-14 shrink-0 pt-1">Labels</span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {labels.length === 0 ? (
            <span className="text-muted/60 text-[11px] pt-1">No labels</span>
          ) : (
            labels.map((l) => {
              const active = value.label_ids?.includes(l.id) ?? false;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      label_ids: toggleNum(value.label_ids, l.id),
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                    active
                      ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="max-w-[120px] truncate">{l.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted w-14 shrink-0">Text</span>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
          <input
            placeholder="match in title / description"
            className="input !pl-7 py-1 text-xs w-full"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
                (e.currentTarget as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setTextDraft(value.q ?? "");
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
          />
        </div>
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

type StatusFilter = "all" | StatusCategory;

function WorkflowTab({ projectId }: { projectId: string }) {
  const can = usePermissionsStore((s) => s.can);
  const { data: statuses = [] } = useStatuses(projectId);
  const create = useCreateStatus(projectId);
  const update = useUpdateStatus(projectId);
  const remove = useDeleteStatus(projectId);
  const reorder = useReorderStatuses(projectId);
  const canEdit = can("workflow.edit");
  const [filter, setFilter] = useState<StatusFilter>("all");
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

  // Mirror the full statuses list during a drag so the row visibly slots
  // before the network commits. Filter (`visibleStatuses`) is derived from
  // the mirror so the user sees the new order immediately.
  const [statusMirror, setStatusMirror] = useState<StatusDefinition[] | null>(null);
  const displayStatuses = statusMirror ?? statuses;
  useDragCursor(statusMirror !== null);

  function handleStatusDragStart(_e: DragStartEvent) {
    setStatusMirror(statuses);
  }

  function handleStatusDragOver(e: DragOverEvent) {
    if (!e.over) return;
    setStatusMirror((prev) => {
      const list = prev ?? statuses;
      const from = list.findIndex((s) => s.id === Number(e.active.id));
      const to = list.findIndex((s) => s.id === Number(e.over!.id));
      if (from < 0 || to < 0 || from === to) return prev;
      return arrayMove(list, from, to);
    });
  }

  function handleStatusDragEnd(_e: DragEndEvent) {
    const next = statusMirror;
    if (!next) {
      setStatusMirror(null);
      return;
    }
    const same =
      next.length === statuses.length &&
      next.every((s, i) => s.id === statuses[i].id);
    if (same) {
      setStatusMirror(null);
      return;
    }
    // Fire the mutation first so its onMutate patches the React Query cache
    // synchronously to the new order; only then clear the mirror. Otherwise the
    // UI flashes the *old* cache between mirror-clear and cache-commit.
    reorder.mutate(next.map((s) => s.id), {
      onSettled: () => setStatusMirror(null),
    });
  }

  function handleStatusDragCancel() {
    setStatusMirror(null);
  }

  const counts = {
    all: displayStatuses.length,
    todo: displayStatuses.filter((s) => s.category === "todo").length,
    in_progress: displayStatuses.filter((s) => s.category === "in_progress").length,
    done: displayStatuses.filter((s) => s.category === "done").length,
  };

  const visibleStatuses = filter === "all"
    ? displayStatuses
    : displayStatuses.filter((s) => s.category === filter);

  const filterChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "todo", label: "To Do", count: counts.todo },
    { key: "in_progress", label: "In Progress", count: counts.in_progress },
    { key: "done", label: "Done", count: counts.done },
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Main: list */}
        <div className="surface-card overflow-hidden order-2 lg:order-1">
          {visibleStatuses.length === 0 ? (
            <EmptyState
              icon={<List className="w-8 h-8" />}
              message={
                filter === "all"
                  ? "No statuses configured."
                  : "No statuses in this category."
              }
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleStatusDragStart}
              onDragOver={handleStatusDragOver}
              onDragEnd={handleStatusDragEnd}
              onDragCancel={handleStatusDragCancel}
            >
              <SortableContext
                items={visibleStatuses.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-border">
                  {visibleStatuses.map((s) => (
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

        {/* Side: Filter + Add status (both sticky, stacked) */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3 pb-2">
          <div className="surface-card p-3">
            <div className="flex flex-wrap gap-1.5">
              {filterChips.map((c) => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {c.label}
                    <span
                      className={`text-[10px] font-mono ${
                        active ? "opacity-70" : "text-muted/60"
                      }`}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {canEdit && (
            <div className="surface-card p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Name
                  </label>
                  <input
                    required
                    placeholder="e.g. Blocked, In Review"
                    className="input w-full h-9"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Category
                  </label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, category: v as StatusCategory }))
                    }
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Color
                  </label>
                  <ColorPicker
                    value={draft.color}
                    onChange={(c) => setDraft((d) => ({ ...d, color: c }))}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={create.isPending || !draft.name.trim()}
                  className="w-full h-9"
                >
                  {create.isPending ? (
                    <>
                      <Spinner className="w-3 h-3" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add status
                    </>
                  )}
                </Button>
                {error && (
                  <p className="text-xs text-[var(--danger)]">{error}</p>
                )}
              </form>
            </div>
          )}
        </aside>
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
        <Tooltip content="Drag to reorder">
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </Tooltip>
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
          <Tooltip content="Remove status">
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
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
  columns,
}: {
  value: string;
  onChange: (c: string) => void;
  columns?: number;
}) {
  const isGrid = !!columns;
  const wrapperClass = isGrid
    ? "inline-grid gap-2 p-2 rounded-lg bg-surface-2/50 border border-border w-fit"
    : "inline-flex gap-1.5 items-center";
  const wrapperStyle = isGrid
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
    : undefined;
  const dotSize = isGrid ? "w-6 h-6" : "w-4 h-4";
  const checkSize = isGrid ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {STATUS_COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            aria-label={`Select color ${c}`}
            aria-pressed={selected}
            className={`relative ${dotSize} rounded-full transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-foreground/30 ${
              selected
                ? "ring-2 ring-offset-2 ring-foreground/80 scale-105 shadow-sm"
                : "ring-1 ring-inset ring-black/5 hover:scale-110 hover:shadow-sm"
            }`}
            style={{ backgroundColor: c }}
          >
            {selected && (
              <Check
                className={`${checkSize} absolute inset-0 m-auto text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]`}
                strokeWidth={3}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_BODY_TEMPLATE = `{
  "event": "{{.event}}",
  "project_id": {{.project_id}},
  "timestamp": "{{.timestamp}}",
  "data": {{.data}}
}`;

type WebhookDraft = {
  name: string;
  url: string;
  active: boolean;
  events: WebhookEvent[];
  method: WebhookMethod;
  content_type: string;
  headers: Array<[string, string]>;
  query_params: Array<[string, string]>;
  auth_type: WebhookAuthType;
  auth_credentials: string;
  body_type: WebhookBodyType;
  body_template: string;
  form_fields: Array<[string, string]>;
};

function emptyDraft(): WebhookDraft {
  return {
    name: "",
    url: "",
    active: true,
    events: ["issue.created", "issue.updated"],
    method: "POST",
    content_type: "application/json",
    headers: [],
    query_params: [],
    auth_type: "none",
    auth_credentials: "",
    body_type: "template",
    body_template: DEFAULT_BODY_TEMPLATE,
    form_fields: [],
  };
}

function hookToDraft(h: Webhook): WebhookDraft {
  return {
    name: h.name ?? "",
    url: h.url,
    active: h.active,
    events: h.events_list,
    method: h.method ?? "POST",
    content_type: h.content_type ?? "application/json",
    headers: Object.entries(h.headers_map ?? {}),
    query_params: Object.entries(h.query_params_map ?? {}),
    auth_type: h.auth_type ?? "none",
    auth_credentials: "",
    body_type: h.body_type ?? "template",
    body_template: h.body_template ?? DEFAULT_BODY_TEMPLATE,
    form_fields: Object.entries(h.form_fields_map ?? {}),
  };
}

function draftToInput(d: WebhookDraft): WebhookInput {
  const headers: Record<string, string> = {};
  d.headers.forEach(([k, v]) => {
    const key = k.trim();
    if (key) headers[key] = v;
  });
  const query_params: Record<string, string> = {};
  d.query_params.forEach(([k, v]) => {
    const key = k.trim();
    if (key) query_params[key] = v;
  });
  const form_fields: Record<string, string> = {};
  d.form_fields.forEach(([k, v]) => {
    const key = k.trim();
    if (key) form_fields[key] = v;
  });
  return {
    name: d.name.trim(),
    url: d.url.trim(),
    events: d.events,
    active: d.active,
    method: d.method,
    content_type:
      d.body_type === "form"
        ? "application/x-www-form-urlencoded"
        : d.content_type.trim() || "application/json",
    headers,
    query_params,
    auth_type: d.auth_type,
    auth_credentials: d.auth_credentials,
    body_type: d.body_type,
    body_template: d.body_template,
    form_fields,
  };
}

function WebhooksTab({ projectId }: { projectId: string }) {
  const { data: hooks = [] } = useWebhooks(projectId);
  const create = useCreateWebhook(projectId);
  const update = useUpdateWebhook(projectId);
  const remove = useDeleteWebhook(projectId);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const active = hooks.filter((h) => h.active);
  const paused = hooks.filter((h) => !h.active);
  const visible = hooks
    .filter((h) =>
      filter === "active"
        ? h.active
        : filter === "paused"
        ? !h.active
        : true,
    )
    .filter((h) =>
      q
        ? h.url.toLowerCase().includes(q) ||
          (h.name ?? "").toLowerCase().includes(q)
        : true,
    );

  const filterChips: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: hooks.length },
    { key: "active", label: "Active", count: active.length },
    { key: "paused", label: "Paused", count: paused.length },
  ];

  const selectedHook =
    typeof selectedId === "number" ? hooks.find((h) => h.id === selectedId) : null;
  const editorMode: "edit" | "new" | null =
    selectedId === "new" ? "new" : selectedHook ? "edit" : null;

  async function handleSave(draft: WebhookDraft) {
    const payload = draftToInput(draft);
    if (editorMode === "new") {
      const createdRaw = await create.mutateAsync(payload);
      if (createdRaw?.secret) setNewSecret(createdRaw.secret);
      if (createdRaw?.id) setSelectedId(createdRaw.id);
    } else if (selectedHook) {
      await update.mutateAsync({ id: selectedHook.id, ...payload });
    }
  }

  async function handleDelete() {
    if (!selectedHook) return;
    if (
      await showConfirm({
        message: `Delete webhook to ${selectedHook.url}?`,
        variant: "danger",
      })
    ) {
      remove.mutate(selectedHook.id);
      setSelectedId(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left: list + filter */}
        <div className="space-y-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pb-2 min-w-0">
          <div className="surface-card p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {filterChips.map((c) => {
                const isActive = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      isActive
                        ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {c.label}
                    <span
                      className={`text-[10px] font-mono ${
                        isActive ? "opacity-70" : "text-muted/60"
                      }`}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  placeholder="Search by name or URL"
                  className="input !pl-8 !py-1 !text-sm h-8 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Tooltip content="New webhook">
                <button
                  type="button"
                  onClick={() => setSelectedId("new")}
                  aria-label="New webhook"
                  className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md bg-brand text-white shadow-sm hover:bg-brand-strong active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            {visible.length === 0 ? (
              <EmptyState
                icon={<WebhookIcon className="w-7 h-7" />}
                message={
                  hooks.length === 0
                    ? "No webhooks yet."
                    : "No webhooks match this filter."
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((h) => (
                  <li
                    key={h.id}
                    onClick={() => setSelectedId(h.id)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors min-w-0 ${
                      selectedId === h.id
                        ? "bg-[var(--brand-soft)]"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          h.active ? "bg-[var(--success)]" : "bg-surface-3"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-mono px-1 rounded shrink-0 ${
                          selectedId === h.id
                            ? "bg-white/60 dark:bg-black/30 text-[var(--brand)]"
                            : "bg-surface-2 text-muted border border-border"
                        }`}
                      >
                        {h.method ?? "POST"}
                      </span>
                      <span
                        className="text-xs font-medium truncate flex-1 min-w-0 text-foreground"
                        title={h.name || h.url}
                      >
                        {h.name || h.url}
                      </span>
                    </div>
                    {h.name && (
                      <p
                        className="text-[10px] font-mono text-muted truncate mt-0.5 pl-4"
                        title={h.url}
                      >
                        {h.url}
                      </p>
                    )}
                    <p className="text-[11px] text-muted truncate mt-0.5 pl-4">
                      {h.events_list.join(", ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="min-h-[300px]">
          {newSecret && (
            <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
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

          {editorMode ? (
            <WebhookEditor
              key={selectedHook?.id ?? "new"}
              projectId={projectId}
              hook={selectedHook ?? null}
              isCreating={editorMode === "new"}
              onSave={handleSave}
              onDelete={editorMode === "edit" ? handleDelete : undefined}
              onCancel={() => setSelectedId(null)}
              saving={create.isPending || update.isPending}
            />
          ) : (
            <div className="surface-card h-full flex items-center justify-center min-h-[300px] rounded-xl border border-border shadow-sm">
              <EmptyState
                icon={<WebhookIcon className="w-12 h-12 text-muted opacity-40" />}
                message="Select a webhook or click the + button to configure a new one."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WebhookEditor({
  projectId,
  hook,
  isCreating,
  saving,
  onSave,
  onDelete,
  onCancel,
}: {
  projectId: string;
  hook: Webhook | null;
  isCreating: boolean;
  saving: boolean;
  onSave: (draft: WebhookDraft) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<WebhookDraft>(() =>
    hook ? hookToDraft(hook) : emptyDraft(),
  );
  const testMutation = useTestWebhookDraft(projectId);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  useEffect(() => {
    setDraft(hook ? hookToDraft(hook) : emptyDraft());
    setTestResult(null);
  }, [hook]);

  function patch<K extends keyof WebhookDraft>(k: K, v: WebhookDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function toggleEvent(e: WebhookEvent) {
    patch(
      "events",
      draft.events.includes(e)
        ? draft.events.filter((x) => x !== e)
        : [...draft.events, e],
    );
  }

  async function handleTest() {
    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync(draftToInput(draft));
      setTestResult(res);
      const ok =
        !res.error && res.status_code >= 200 && res.status_code < 300;
      if (ok) {
        toast(`Webhook test succeeded (${res.status_code})`, "success");
      } else if (res.error) {
        toast(`Webhook test failed: ${res.error}`, "error");
      } else {
        toast(
          `Webhook test returned ${res.status_code || "no response"}`,
          "warning",
        );
      }
    } catch (err: any) {
      toast(err?.response?.data?.error ?? "Webhook test failed", "error");
    }
  }

  const bodyValid =
    draft.body_type === "form"
      ? draft.form_fields.some(([k]) => k.trim().length > 0)
      : draft.body_template.trim().length > 0;
  const canSubmit = !!draft.url.trim() && draft.events.length > 0 && bodyValid;
  const canTest = canSubmit;

  return (
    <div className="space-y-3 min-w-0">
      <div className="surface-card overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-wrap items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
            {isCreating
              ? "New webhook"
              : draft.name || hook?.url || "Webhook"}
          </h2>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted shrink-0">
            <Checkbox
              checked={draft.active}
              onCheckedChange={(v) => patch("active", !!v)}
            />
            Active
          </label>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Name */}
          <FieldSection title="Name" hint={<span className="text-muted/70">Optional display label</span>}>
            <input
              placeholder="e.g. Slack notifier, Zapier sync"
              className="input w-full h-9"
              value={draft.name}
              onChange={(e) => patch("name", e.target.value)}
              maxLength={200}
            />
          </FieldSection>

          {/* Endpoint */}
          <FieldSection title="Endpoint">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[110px_1fr] lg:grid-cols-[110px_1fr_200px]">
              <div>
                <Label>Method</Label>
                <Select
                  value={draft.method}
                  onValueChange={(v) => patch("method", v as WebhookMethod)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as WebhookMethod[]
                    ).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label>URL</Label>
                <input
                  required
                  type="url"
                  placeholder="https://example.com/webhook"
                  className="input w-full h-9 font-mono text-xs"
                  value={draft.url}
                  onChange={(e) => patch("url", e.target.value)}
                />
              </div>
              <div className="lg:col-auto sm:col-span-2 lg:col-span-1 min-w-0">
                <Label>Content-Type</Label>
                {draft.body_type === "form" ? (
                  <div className="input h-9 w-full !text-xs font-mono flex items-center text-muted bg-surface-2/40">
                    application/x-www-form-urlencoded
                  </div>
                ) : (
                  <AutocompleteInput
                    value={draft.content_type}
                    onChange={(v) => patch("content_type", v)}
                    options={CONTENT_TYPE_PRESETS}
                    placeholder="application/json"
                  />
                )}
                {draft.body_type === "form" && (
                  <p className="text-[11px] text-muted mt-1">
                    Auto-set by Form body mode.
                  </p>
                )}
              </div>
            </div>
          </FieldSection>

          {/* Auth */}
          <FieldSection title="Authentication">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.auth_type}
                  onValueChange={(v) => patch("auth_type", v as WebhookAuthType)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic auth</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="header">Custom header</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.auth_type !== "none" && (
                <div className="min-w-0">
                  <Label>
                    {draft.auth_type === "basic" && "user:password"}
                    {draft.auth_type === "bearer" && "Token"}
                    {draft.auth_type === "header" && "Header: value"}
                  </Label>
                  <input
                    type="password"
                    placeholder={
                      draft.auth_type === "basic"
                        ? "admin:s3cret"
                        : draft.auth_type === "bearer"
                        ? "eyJhbGciOi…"
                        : "X-Api-Key: abc123"
                    }
                    className="input w-full h-9 font-mono text-xs"
                    value={draft.auth_credentials}
                    onChange={(e) => patch("auth_credentials", e.target.value)}
                  />
                  {!isCreating && (
                    <p className="text-[11px] text-muted mt-1">
                      Leave empty to keep the previously saved value.
                    </p>
                  )}
                </div>
              )}
            </div>
          </FieldSection>

          {/* Query params */}
          <FieldSection title="Query parameters">
            <KeyValueEditor
              pairs={draft.query_params}
              onChange={(p) => patch("query_params", p)}
              keyPlaceholder="param"
              valuePlaceholder="value"
            />
          </FieldSection>

          {/* Headers */}
          <FieldSection title="HTTP headers">
            <KeyValueEditor
              pairs={draft.headers}
              onChange={(p) => patch("headers", p)}
              keyPlaceholder="Header-Name"
              valuePlaceholder="value"
              keyOptions={COMMON_HEADER_KEYS}
            />
          </FieldSection>

          {/* Body */}
          <FieldSection
            title="Body"
            hint={
              <div className="inline-flex rounded-lg border border-border bg-surface-2/40 p-0.5">
                {(["template", "form"] as WebhookBodyType[]).map((bt) => {
                  const active = draft.body_type === bt;
                  return (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => patch("body_type", bt)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {bt === "template" ? "Raw template" : "Form data"}
                    </button>
                  );
                })}
              </div>
            }
          >
            {draft.body_type === "template" ? (
              <>
                <details className="group mb-2 rounded-lg border border-border bg-surface-2/50 text-xs text-muted overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 flex items-center gap-1.5 hover:bg-surface-2/80 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-90" />
                    <span className="font-medium text-foreground">
                      Template syntax & placeholders
                    </span>
                    <span className="text-[11px] text-muted/60 ml-auto group-open:hidden">
                      Show
                    </span>
                    <span className="text-[11px] text-muted/60 ml-auto hidden group-open:inline">
                      Hide
                    </span>
                  </summary>
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                    <p>
                      The exact bytes sent as the HTTP request body. Written in{" "}
                      <a
                        href="https://pkg.go.dev/text/template"
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        Go text/template
                      </a>{" "}
                      syntax — placeholders are wrapped in{" "}
                      <code className="font-mono bg-surface px-1 rounded border border-border">{`{{ }}`}</code>
                      and replaced at delivery time. Output must match your
                      selected Content-Type (e.g. valid JSON for{" "}
                      <code className="font-mono bg-surface px-1 rounded border border-border">application/json</code>).
                    </p>
                    <div>
                      <p className="font-medium text-foreground mb-1">
                        Available placeholders
                      </p>
                      <ul className="space-y-1 ml-0.5">
                        <li className="flex flex-wrap items-baseline gap-1.5">
                          <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{`{{.event}}`}</code>
                          <span>event name, e.g.</span>
                          <code className="font-mono bg-surface px-1 rounded border border-border">issue.created</code>
                        </li>
                        <li className="flex flex-wrap items-baseline gap-1.5">
                          <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{`{{.project_id}}`}</code>
                          <span>numeric project id</span>
                        </li>
                        <li className="flex flex-wrap items-baseline gap-1.5">
                          <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{`{{.timestamp}}`}</code>
                          <span>ISO-8601 UTC timestamp</span>
                        </li>
                        <li className="flex flex-wrap items-baseline gap-1.5">
                          <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{`{{.data}}`}</code>
                          <span>raw JSON payload (inline, unescaped — use as a JSON value)</span>
                        </li>
                        <li className="flex flex-wrap items-baseline gap-1.5">
                          <code className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{`{{.data_json}}`}</code>
                          <span>same payload but quoted as a JSON string (use inside a string field)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </details>
                <textarea
                  className="input w-full font-mono text-xs leading-relaxed min-h-[180px] resize-y"
                  value={draft.body_template}
                  onChange={(e) => patch("body_template", e.target.value)}
                  spellCheck={false}
                />
              </>
            ) : (
              <>
                <p className="text-[11px] text-muted mb-2">
                  Each row becomes a form field. Values are URL-encoded
                  automatically and may include template placeholders like{" "}
                  <code className="font-mono bg-surface px-1 rounded border border-border">{`{{.event}}`}</code>
                  ,{" "}
                  <code className="font-mono bg-surface px-1 rounded border border-border">{`{{.data_json}}`}</code>
                  .
                </p>
                <KeyValueEditor
                  pairs={draft.form_fields}
                  onChange={(p) => patch("form_fields", p)}
                  keyPlaceholder="field_name"
                  valuePlaceholder="value or {{.event}}"
                />
              </>
            )}
          </FieldSection>

          {/* Events */}
          <FieldSection
            title="Events"
            hint={
              <span className="text-muted/70">
                {draft.events.length} selected
              </span>
            }
          >
            <div className="space-y-3">
              {WEBHOOK_EVENT_GROUPS.map((group) => {
                const selectedInGroup = group.events.filter((e) =>
                  draft.events.includes(e),
                ).length;
                const allSelected = selectedInGroup === group.events.length;
                return (
                  <div key={group.label} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {group.label}
                      </h4>
                      <span className="text-[10px] text-muted/60 font-mono">
                        {selectedInGroup}/{group.events.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            patch(
                              "events",
                              draft.events.filter(
                                (e) => !group.events.includes(e),
                              ),
                            );
                          } else {
                            const set = new Set(draft.events);
                            group.events.forEach((e) => set.add(e));
                            patch("events", Array.from(set));
                          }
                        }}
                        className="text-[11px] text-muted hover:text-foreground transition-colors ml-auto"
                      >
                        {allSelected ? "Clear" : "Select all"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.events.map((e) => (
                        <Tooltip
                          key={e}
                          content={WEBHOOK_EVENT_DESCRIPTIONS[e]}
                        >
                          <button
                            type="button"
                            onClick={() => toggleEvent(e)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                              draft.events.includes(e)
                                ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                                : "border-border text-muted hover:text-foreground"
                            }`}
                          >
                            {e}
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </FieldSection>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-border flex flex-wrap items-center gap-2 bg-surface-2/40">
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
          <div className="sm:ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleTest}
              disabled={testMutation.isPending || !canTest}
            >
              {testMutation.isPending ? (
                <>
                  <Spinner className="w-3 h-3" />
                  Testing…
                </>
              ) : (
                "Send test"
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(draft)}
              disabled={!canSubmit || saving}
            >
              {saving ? (
                <>
                  <Spinner className="w-3 h-3" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {isCreating ? "Create webhook" : "Save changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {testResult && (
        <TestResultPanel
          result={testResult}
          onDismiss={() => setTestResult(null)}
        />
      )}
    </div>
  );
}

function FieldSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
        {hint && <div className="text-[11px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-muted block mb-1.5">
      {children}
    </label>
  );
}

const COMMON_HEADER_KEYS = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Cookie",
  "Origin",
  "Referer",
  "User-Agent",
  "X-Api-Key",
  "X-Auth-Token",
  "X-Custom-Header",
  "X-Forwarded-For",
  "X-Hub-Signature",
  "X-Request-ID",
  "X-Webhook-Source",
];

function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  keyOptions,
}: {
  pairs: Array<[string, string]>;
  onChange: (next: Array<[string, string]>) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  keyOptions?: string[];
}) {
  function update(i: number, k: string, v: string) {
    const next = [...pairs];
    next[i] = [k, v];
    onChange(next);
  }
  function remove(i: number) {
    onChange(pairs.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...pairs, ["", ""]]);
  }
  return (
    <div className="space-y-1.5">
      {pairs.length === 0 && (
        <p className="text-[11px] text-muted/70">None.</p>
      )}
      {pairs.map(([k, v], i) => (
        <div key={i} className="flex flex-wrap sm:flex-nowrap gap-1.5 items-start">
          {keyOptions ? (
            <AutocompleteInput
              value={k}
              onChange={(nk) => update(i, nk, v)}
              options={keyOptions}
              placeholder={keyPlaceholder}
              className="flex-1 min-w-0"
            />
          ) : (
            <input
              placeholder={keyPlaceholder}
              className="input !py-1 !text-xs h-8 flex-1 min-w-0 font-mono"
              value={k}
              onChange={(e) => update(i, e.target.value, v)}
            />
          )}
          <input
            placeholder={valuePlaceholder}
            className="input !py-1 !text-xs h-8 flex-[1.5] min-w-0 font-mono"
            value={v}
            onChange={(e) => update(i, k, e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            aria-label="Remove"
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded text-muted hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10 transition mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={add} className="h-8">
        <Plus className="w-3 h-3" />
        Add row
      </Button>
    </div>
  );
}

function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;
  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    if (highlighted >= filtered.length) setHighlighted(0);
  }, [filtered.length, highlighted]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <input
        placeholder={placeholder}
        className="input !py-1 !text-xs h-8 w-full font-mono"
        value={value}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlighted((h) => Math.min(filtered.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter") {
            if (showDropdown && filtered[highlighted]) {
              e.preventDefault();
              commit(filtered[highlighted]);
            } else {
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Tab") {
            setOpen(false);
          }
        }}
      />
      {showDropdown && (
        <div
          className="absolute z-30 top-full left-0 right-0 mt-1 surface-card rounded-lg border border-border shadow-md overflow-hidden"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <ul className="max-h-52 overflow-y-auto py-1 text-xs">
            {filtered.map((opt, idx) => {
              const active = idx === highlighted;
              return (
                <li
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(opt);
                  }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`px-2.5 py-1.5 font-mono cursor-pointer ${
                    active
                      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  {highlightMatch(opt, q)}
                </li>
              );
            })}
          </ul>
          {q && !options.some((o) => o.toLowerCase() === q) && (
            <div className="border-t border-border px-2.5 py-1.5 text-[11px] text-muted bg-surface-2/50">
              <span className="opacity-70">Press Enter to use</span>{" "}
              <code className="font-mono text-foreground">{value}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold underline decoration-dotted underline-offset-2">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

const CONTENT_TYPE_PRESETS = [
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/plain",
  "text/html",
  "text/csv",
];

function TestResultPanel({
  result,
  onDismiss,
}: {
  result: WebhookTestResult;
  onDismiss: () => void;
}) {
  const ok =
    !result.error && result.status_code >= 200 && result.status_code < 300;
  return (
    <div
      className={`rounded-xl border p-4 ${
        ok
          ? "bg-[color-mix(in_srgb,var(--success)_8%,transparent)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]"
      }`}
    >
      <div className="flex items-start gap-2 mb-3 min-w-0">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${
            ok
              ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]"
              : "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]"
          }`}
        >
          {result.status_code || "—"}
        </span>
        <span className="text-xs font-mono text-muted truncate flex-1 min-w-0">
          {result.method} {result.url}
        </span>
        <button
          onClick={onDismiss}
          className="text-xs text-muted hover:text-foreground shrink-0"
        >
          Dismiss
        </button>
      </div>
      {result.error && (
        <p className="text-xs text-[var(--danger)] mb-2">{result.error}</p>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted hover:text-foreground select-none">
          Sent body
        </summary>
        <pre className="mt-2 bg-surface border border-border rounded-lg p-2.5 overflow-auto max-h-40 font-mono text-[11px]">
          {result.sent_body}
        </pre>
      </details>
      <details className="text-xs mt-2" open>
        <summary className="cursor-pointer text-muted hover:text-foreground select-none">
          Response body
        </summary>
        <pre className="mt-2 bg-surface border border-border rounded-lg p-2.5 overflow-auto max-h-60 font-mono text-[11px]">
          {result.response_body || "(empty)"}
        </pre>
      </details>
    </div>
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
    <div className="surface-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Date & time format
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Date
          </label>
          <Select
            value={project?.date_format ?? "MMM DD, YYYY"}
            onValueChange={(v) => setFmt("date_format", v)}
          >
            <SelectTrigger className="h-9">
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
          <p className="text-xs text-muted mt-1.5 truncate">
            <span className="text-foreground font-medium">
              {fmt(now, project?.date_format ?? "MMM DD, YYYY")}
            </span>
          </p>
        </div>
        <div>
          <label className="text-xs text-muted font-medium block mb-1.5">
            Time
          </label>
          <Select
            value={project?.time_format ?? "h:mm A"}
            onValueChange={(v) => setFmt("time_format", v)}
          >
            <SelectTrigger className="h-9">
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
          <p className="text-xs text-muted mt-1.5 truncate">
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
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground shrink-0">
          Issues — Import / Export
        </h2>
        <div className="flex flex-wrap gap-2 ml-auto shrink-0">
          <Button size="sm" variant="secondary" onClick={downloadCsv}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? "Importing…" : "Import CSV"}
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
      </div>
      <div className="rounded-lg bg-surface-2/50 border border-border p-3 text-xs text-muted leading-relaxed">
        <p className="font-medium text-foreground mb-1.5">CSV columns</p>
        <p>
          Required:{" "}
          <code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">
            title
          </code>
          . Optional:{" "}
          {CSV_COLS.map((col, i) => (
            <span key={col}>
              <code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">
                {col}
              </code>
              {i < CSV_COLS.length - 1 ? ", " : ". "}
            </span>
          ))}
        </p>
        <p className="mt-1.5">
          Dates use ISO format (<code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">YYYY-MM-DD</code>).
          Labels and components are comma-separated within a single cell.
        </p>
      </div>
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
  const { data: users = [] } = useProjectUsers(projectId);
  const create = useCreateComponent(projectId);
  const update = useUpdateComponent(projectId);
  const remove = useDeleteComponent(projectId);
  const reorder = useReorderComponents(projectId);

  const [draft, setDraft] = useState<{ name: string; lead_id: string }>({
    name: "",
    lead_id: "",
  });
  const [filter, setFilter] = useState<"all" | "with-lead" | "without-lead">("all");
  const [search, setSearch] = useState("");
  const canCreate = can("component.create");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Mirror full components list during drag for instant rearrange.
  const [componentMirror, setComponentMirror] = useState<typeof components | null>(null);
  const displayComponents = componentMirror ?? components;
  useDragCursor(componentMirror !== null);

  function handleDragStart(_e: DragStartEvent) {
    setComponentMirror(components);
  }

  function handleDragOver(e: DragOverEvent) {
    if (!e.over) return;
    setComponentMirror((prev) => {
      const list = prev ?? components;
      const from = list.findIndex((c) => c.id === Number(e.active.id));
      const to = list.findIndex((c) => c.id === Number(e.over!.id));
      if (from < 0 || to < 0 || from === to) return prev;
      return arrayMove(list, from, to);
    });
  }

  function handleDragEnd(_e: DragEndEvent) {
    const next = componentMirror;
    if (!next) {
      setComponentMirror(null);
      return;
    }
    const same =
      next.length === components.length &&
      next.every((c, i) => c.id === components[i].id);
    if (same) {
      setComponentMirror(null);
      return;
    }
    reorder.mutate(next.map((c) => c.id), {
      onSettled: () => setComponentMirror(null),
    });
  }

  function handleDragCancel() {
    setComponentMirror(null);
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

  const withLeadCount = displayComponents.filter((c) => c.lead_id != null).length;
  const withoutLeadCount = displayComponents.length - withLeadCount;
  const q = search.trim().toLowerCase();
  const visible = displayComponents
    .filter((c) =>
      filter === "with-lead"
        ? c.lead_id != null
        : filter === "without-lead"
        ? c.lead_id == null
        : true,
    )
    .filter((c) => (q ? c.name.toLowerCase().includes(q) : true));

  const filterChips: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: displayComponents.length },
    { key: "with-lead", label: "With lead", count: withLeadCount },
    { key: "without-lead", label: "Without lead", count: withoutLeadCount },
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Main: list */}
        <div className="surface-card overflow-hidden order-2 lg:order-1">
          {visible.length === 0 ? (
            <EmptyState
              icon={<Puzzle className="w-8 h-8" />}
              message={
                components.length === 0
                  ? "No components yet."
                  : "No components match this filter."
              }
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={visible.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-border">
                  {visible.map((c) => (
                    <ComponentRow
                      key={c.id}
                      c={c}
                      users={users}
                      canEdit={can("component.edit")}
                      canDelete={can("component.delete")}
                      onRename={(name) =>
                        update.mutate({ id: c.id, name, lead_id: c.lead_id })
                      }
                      onLead={(leadId) =>
                        update.mutate({
                          id: c.id,
                          name: c.name,
                          lead_id: leadId,
                        })
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

        {/* Side: Filter + Search + Add (sticky) */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3 pb-2">
          <div className="surface-card p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {filterChips.map((c) => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-[var(--brand-soft)] border-[color-mix(in_srgb,var(--brand)_30%,transparent)] text-[var(--brand)]"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {c.label}
                    <span
                      className={`text-[10px] font-mono ${
                        active ? "opacity-70" : "text-muted/60"
                      }`}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                placeholder="Search components"
                className="input !pl-8 !py-1 !text-sm h-8 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted pt-1">
              Showing{" "}
              <span className="font-mono text-foreground">{visible.length}</span>
              {(filter !== "all" || q) && (
                <>
                  {" "}of{" "}
                  <span className="font-mono">{components.length}</span>
                </>
              )}
              {" "}
              {visible.length === 1 ? "component" : "components"}
            </p>
          </div>

          {canCreate && (
            <div className="surface-card p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Name
                  </label>
                  <input
                    required
                    placeholder="e.g. Frontend, API"
                    className="input w-full h-9"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Lead
                  </label>
                  <UserSearchSelect
                    value={draft.lead_id || "__none__"}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        lead_id: v === "__none__" ? "" : v,
                      }))
                    }
                    users={users}
                    noneLabel="No lead"
                    placeholder="Select lead…"
                    triggerClassName="w-full h-9"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={create.isPending || !draft.name.trim()}
                  className="w-full h-9"
                >
                  {create.isPending ? (
                    <>
                      <Spinner className="w-3 h-3" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add component
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LabelsTab({ projectId }: { projectId: string }) {
  const can = usePermissionsStore((s) => s.can);
  const { data: labels = [] } = useLabels(projectId);
  const create = useCreateLabel(projectId);
  const update = useUpdateLabel(projectId);
  const remove = useDeleteLabel(projectId);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [search, setSearch] = useState("");
  const canEdit = can("issue.edit");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), color });
    setName("");
    setColor("#6366f1");
  }

  const q = search.trim().toLowerCase();
  const visible = q
    ? labels.filter((l) => l.name.toLowerCase().includes(q))
    : labels;

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Main: label grid */}
        <div className="surface-card overflow-hidden order-2 lg:order-1">
          {visible.length === 0 ? (
            <EmptyState
              icon={<Tag className="w-8 h-8" />}
              message={
                labels.length === 0
                  ? "No labels yet."
                  : "No labels match your search."
              }
            />
          ) : (
            <ul className="grid gap-2 p-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((l) => (
                <li
                  key={l.id}
                  className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-2 transition"
                >
                  <LabelRow
                    label={l}
                    canEdit={canEdit}
                    canDelete={canEdit}
                    onRename={(name) => update.mutate({ id: l.id, name })}
                    onRecolor={(color) => update.mutate({ id: l.id, color })}
                    onDelete={async () => {
                      if (
                        await showConfirm({
                          message: `Delete label "${l.name}"?`,
                          variant: "danger",
                        })
                      )
                        remove.mutate(l.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side: search + add (sticky) */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3 pb-2">
          <div className="surface-card p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                placeholder="Search labels"
                className="input !pl-8 !py-1 !text-sm h-8 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted pt-1">
              Showing{" "}
              <span className="font-mono text-foreground">{visible.length}</span>
              {q && (
                <>
                  {" "}of <span className="font-mono">{labels.length}</span>
                </>
              )}
              {" "}
              {visible.length === 1 ? "label" : "labels"}
            </p>
          </div>

          {canEdit && (
            <div className="surface-card p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Name
                  </label>
                  <input
                    required
                    placeholder="e.g. blocker, frontend"
                    className="input w-full h-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      aria-label="Label color"
                    />
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border text-xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-foreground">
                        {name.trim() || "preview"}
                      </span>
                    </span>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={create.isPending || !name.trim()}
                  className="w-full h-9"
                >
                  {create.isPending ? (
                    <>
                      <Spinner className="w-3 h-3" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add label
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LabelRow({
  label,
  canEdit,
  canDelete,
  onRename,
  onRecolor,
  onDelete,
}: {
  label: { id: number; name: string; color: string };
  canEdit: boolean;
  canDelete: boolean;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rename, setRename] = useState(label.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    if (rename.trim() && rename.trim() !== label.name) {
      onRename(rename.trim());
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3">
      {canEdit ? (
        <input
          type="color"
          value={label.color}
          onChange={(e) => onRecolor(e.target.value)}
          className="w-6 h-6 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
          title="Change color"
        />
      ) : (
        <span
          className="w-4 h-4 rounded shrink-0"
          style={{ backgroundColor: label.color }}
          aria-hidden
        />
      )}
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          className="input h-7 text-sm py-0 flex-1 min-w-0"
          value={rename}
          onChange={(e) => setRename(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setRename(label.name); setEditing(false); }
          }}
        />
      ) : (
        <span
          className="text-sm text-foreground flex-1 min-w-0 truncate cursor-pointer hover:text-brand"
          onClick={() => { if (canEdit) { setRename(label.name); setEditing(true); } }}
        >
          {label.name}
        </span>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          aria-label={`Delete ${label.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
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
        <Tooltip content="Drag to reorder">
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing select-none transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </Tooltip>
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
        {lead && !editing && !canEdit && (
          <p className="text-xs text-muted mt-0.5">Lead: {lead.name}</p>
        )}
      </div>
      {canEdit && (
        <UserSearchSelect
          value={c.lead_id != null ? String(c.lead_id) : "__none__"}
          onValueChange={(v) => onLead(v === "__none__" ? undefined : Number(v))}
          users={users}
          noneLabel="No lead"
          placeholder="Select lead..."
          triggerClassName="w-auto !py-1 !text-xs min-w-[220px]"
        />
      )}
      {canDelete && (
        <Tooltip content="Remove component">
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function autoSize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (editing && multiline) autoSize(textareaRef.current);
  }, [editing, multiline, draft]);

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
              ref={(el) => {
                textareaRef.current = el;
                autoSize(el);
              }}
              autoFocus
              className="input py-1.5 text-sm w-full resize-none overflow-hidden min-h-[60px]"
              placeholder={placeholder}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                autoSize(e.currentTarget);
              }}
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
            className={`hover:text-brand transition-colors text-left max-w-full block w-full ${
              multiline
                ? "whitespace-pre-wrap break-words"
                : "truncate"
            }`}
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
      <div className="grid gap-6 items-start grid-cols-1 lg:grid-cols-[300px_1fr]">
        {/* ── Left: Role list ── */}
        <div className="surface-card divide-y divide-border overflow-hidden rounded-xl border border-border shadow-sm lg:max-h-[calc(100vh-12rem)] flex flex-col">
          <div className="overflow-y-auto flex-1">
            {/* Section: System roles */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Lock className="w-3.5 h-3.5 text-muted" />
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
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${selectedRoleId === r.id ? "text-brand" : "text-muted"}`} />
                      <span className="font-medium truncate flex-1">
                        {r.name}
                      </span>
                      {renderRolePermBadge(r)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        <Lock className="w-2.5 h-2.5" />
                        System
                      </span>
                      <span className="text-xs text-muted">Built-in role</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Custom roles */}
            <div className="p-4 pt-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="w-3.5 h-3.5 text-muted" />
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
                    <Users className={`w-3.5 h-3.5 shrink-0 ${selectedRoleId === r.id ? "text-brand" : "text-muted"}`} />
                    <span className="font-medium truncate flex-1">
                      {r.name}
                    </span>
                    {renderRolePermBadge(r)}
                    <Tooltip content="Delete role">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r);
                        }}
                        aria-label="Delete role"
                        className="shrink-0 p-1 rounded text-muted/30 hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create role (pinned, never scrolls) */}
          <div className="p-4 border-t border-border shrink-0 bg-surface">
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
                  <Spinner className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {createRole.isPending ? "Adding…" : "Add role"}
              </Button>
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
                icon={<Lock className="w-12 h-12 text-muted opacity-40" />}
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
    <div className="surface-card overflow-hidden flex flex-col lg:max-h-[calc(100vh-12rem)] rounded-xl border border-border shadow-sm">
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
                <Tooltip content="Save (Enter)">
                  <button
                    onClick={saveRename}
                    disabled={!nameDraft.trim() || updateRole.isPending}
                    aria-label="Save"
                    className="shrink-0 p-1 rounded text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors disabled:opacity-30"
                  >
<Check className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Cancel (Esc)">
                  <button
                    onClick={cancelRename}
                    aria-label="Cancel"
                    className="shrink-0 p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                  <X className="w-3.5 h-3.5" />
                </button>
                </Tooltip>
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
                  <Pencil className="w-3.5 h-3.5" />
                  Rename
                </button>
                <span className="text-muted/30">|</span>
                <button
                  onClick={onDelete}
                  className="text-sm text-muted hover:text-[var(--danger)] transition-colors inline-flex items-center gap-1"
                >
<Trash2 className="w-3.5 h-3.5" />
                  Delete role
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted inline-flex items-center gap-1.5">
            {readOnly ? (
              <>
                <Lock className="w-3 h-3" />
                System role — view only. Permissions are fixed.
              </>
            ) : (
              "Toggle permissions to customize what this role can do."
            )}
          </p>
          <span className="text-xs font-mono text-muted/60 shrink-0 ml-4">
            {totalChecked}/{safePerms.length} permissions
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
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
<X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>



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
                          <Check className="w-3.5 h-3.5" />
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
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(p.key)}
                              disabled={permLoading || readOnly}
                              className={readOnly ? "opacity-50 cursor-not-allowed" : ""}
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
                  <Check className="w-3 h-3" />
                  {added.size} added
                </span>
                <span className="text-muted/40">|</span>
                <span className="inline-flex items-center gap-1 text-[var(--danger)]">
                  <X className="w-3 h-3" />
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
                  <Spinner className="w-3 h-3" />
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
