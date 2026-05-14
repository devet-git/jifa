"use client";

import { useState } from "react";
import {
  useIssue,
  useIssues,
  useUpdateIssueStatus,
  useAddComment,
  useCloneIssue,
} from "@/hooks/useIssues";
import { useUsers } from "@/hooks/useUsers";
import { useLabels, useSetIssueLabels } from "@/hooks/useLabels";
import { useWatchers, useToggleWatch } from "@/hooks/useWatchers";
import { useVersions } from "@/hooks/useVersions";
import { useComponents, useSetIssueComponents } from "@/hooks/useComponents";
import { useStatuses } from "@/hooks/useStatuses";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SubTaskList } from "@/components/issues/SubTaskList";
import { LinksPanel } from "@/components/issues/LinksPanel";
import { ActivityFeed } from "@/components/issues/ActivityFeed";
import { CommentBox } from "@/components/issues/CommentBox";
import { AttachmentPanel } from "@/components/issues/AttachmentPanel";
import { TimeTrackingPanel } from "@/components/issues/TimeTrackingPanel";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Issue, IssuePriority } from "@/types";

interface Props {
  issue: Issue;
  onClose: () => void;
}

const PRIORITY_OPTIONS: IssuePriority[] = ["low", "medium", "high", "urgent"];

const EPIC_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#94a3b8",
];

type Tab = "comments" | "activity" | "links";

export function IssueDetail({ issue: initialIssue, onClose }: Props) {
  const qc = useQueryClient();
  const { data: issue = initialIssue } = useIssue(initialIssue.id);
  const { data: users = [] } = useUsers();
  const { data: projectLabels = [] } = useLabels(issue.project_id);
  const { data: projectIssues = [] } = useIssues({
    project_id: issue.project_id,
  });
  const { data: watchers = [] } = useWatchers(issue.id);
  const { data: versions = [] } = useVersions(issue.project_id);
  const { data: projectComponents = [] } = useComponents(issue.project_id);
  const { data: statuses = [] } = useStatuses(issue.project_id);
  const setIssueComponents = useSetIssueComponents();
  const { user } = useAuthStore();
  const toggleWatch = useToggleWatch(issue.id);
  const setIssueLabelsMutation = useSetIssueLabels();
  const updateStatus = useUpdateIssueStatus();
  const addComment = useAddComment();
  const cloneIssue = useCloneIssue();

  async function handleClone() {
    const created = await cloneIssue.mutateAsync(issue.id);
    onClose();
    // After invalidation the new issue is visible in the lists; let the user
    // know which key was created so they can open it.
    if (typeof window !== "undefined") {
      window.alert(`Cloned to ${created.key ?? `#${created.id}`}`);
    }
  }

  const [submitting, setSubmitting] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  async function handleUpdateComment(commentId: number, body: string) {
    await api.put(`/issues/${issue.id}/comments/${commentId}`, { body });
    setEditingCommentId(null);
    qc.invalidateQueries({ queryKey: ["issue", issue.id] });
  }
  async function handleDeleteComment(commentId: number) {
    if (!confirm("Delete this comment?")) return;
    await api.delete(`/issues/${issue.id}/comments/${commentId}`);
    qc.invalidateQueries({ queryKey: ["issue", issue.id] });
  }
  const [descDraft, setDescDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showComponentPicker, setShowComponentPicker] = useState(false);
  const [tab, setTab] = useState<Tab>("comments");

  const currentLabelIds = (issue.labels ?? []).map((l) => l.id);
  const currentComponentIds = (issue.components ?? []).map((c) => c.id);

  function toggleComponent(id: number) {
    const next = currentComponentIds.includes(id)
      ? currentComponentIds.filter((x) => x !== id)
      : [...currentComponentIds, id];
    setIssueComponents.mutate({ issueId: issue.id, componentIds: next });
  }
  const isWatching = !!user && watchers.some((w) => w.user_id === user.id);
  const isEpic = issue.type === "epic";
  const epics = projectIssues.filter(
    (i) => i.type === "epic" && i.id !== issue.id,
  );
  const parentEpic = projectIssues.find((i) => i.id === issue.parent_id);

  function toggleLabel(labelId: number) {
    const newIds = currentLabelIds.includes(labelId)
      ? currentLabelIds.filter((id) => id !== labelId)
      : [...currentLabelIds, labelId];
    setIssueLabelsMutation.mutate({ issueId: issue.id, labelIds: newIds });
  }

  async function handleCommentSubmit(body: string, mentionUserIds: number[]) {
    setSubmitting(true);
    await addComment.mutateAsync({
      issueId: issue.id,
      body,
      mentionUserIds,
    });
    setSubmitting(false);
  }

  // updateField sends only the changed field via the typed DTO, mapping `null`
  // to the appropriate clear_* flag so the backend can distinguish "unset" from
  // "absent".
  async function updateField(field: string, value: unknown) {
    const body = buildPatch(field, value);
    await api.put(`/issues/${issue.id}`, body);
    qc.invalidateQueries({ queryKey: ["issues", issue.id] });
    qc.invalidateQueries({ queryKey: ["issues"] });
    qc.invalidateQueries({ queryKey: ["activity", issue.id] });
  }

  function startEditDesc() {
    setDescDraft(issue.description ?? "");
    setEditingDesc(true);
  }
  async function saveDesc() {
    await updateField("description", descDraft);
    setEditingDesc(false);
  }

  function startEditTitle() {
    setTitleDraft(issue.title);
    setEditingTitle(true);
  }
  async function saveTitle() {
    const t = titleDraft.trim();
    if (t && t !== issue.title) await updateField("title", t);
    setEditingTitle(false);
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "comments", label: "Comments", count: issue.comments?.length ?? 0 },
    { key: "activity", label: "Activity" },
    { key: "links", label: "Links" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in">
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="w-full max-w-2xl bg-surface shadow-2xl overflow-y-auto flex flex-col border-l border-border"
        style={{ animation: "slideDown 220ms ease-out both" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-surface/95 backdrop-blur z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge type="issueType" value={issue.type} />
              {isEpic && issue.color && (
                <span
                  className="inline-block w-3 h-3 rounded-full ring-2 ring-surface"
                  style={{ backgroundColor: issue.color }}
                  title={issue.color}
                />
              )}
              <span className="text-xs text-muted font-mono bg-surface-2 px-1.5 py-0.5 rounded">
                {issue.key ?? `#${issue.id}`}
              </span>
              {parentEpic && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md text-white font-medium"
                  style={{ backgroundColor: parentEpic.color || "#94a3b8" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                  </svg>
                  {parentEpic.title}
                </span>
              )}
            </div>
            {editingTitle ? (
              <div className="flex gap-2 items-center">
                <input
                  className="input !text-lg font-bold flex-1"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                />
                <Button size="sm" onClick={saveTitle}>
                  Save
                </Button>
              </div>
            ) : (
              <h2
                className="text-lg font-bold cursor-text hover:bg-surface-2 rounded-md px-2 -mx-2 py-1 -my-1 transition"
                onClick={startEditTitle}
                title="Click to edit"
              >
                {issue.title}
              </h2>
            )}
          </div>
          <div className="ml-4 flex items-start gap-2">
            <button
              onClick={() => toggleWatch.mutate(isWatching)}
              title={isWatching ? "Stop watching" : "Watch"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ring-1 transition ${
                isWatching
                  ? "bg-brand-soft text-brand-strong ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
                  : "ring-border text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {isWatching ? "Watching" : "Watch"}
              <span className="opacity-70">{watchers.length}</span>
            </button>
            <button
              onClick={handleClone}
              disabled={cloneIssue.isPending}
              title="Duplicate issue"
              aria-label="Duplicate issue"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Status selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-2 uppercase tracking-wider">
              Status
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map((s) => {
                const active = issue.status === s.key;
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      updateStatus.mutate({ id: issue.id, status: s.key })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ring-1 transition inline-flex items-center gap-1.5 ${
                      active
                        ? "bg-brand-soft text-brand-strong ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] shadow-sm"
                        : "ring-border text-muted hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color || "#94a3b8" }}
                    />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Priority
              </p>
              <select
                className="input !py-1.5 !text-xs"
                value={issue.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Story Points
              </p>
              <select
                className="input !py-1.5 !text-xs"
                value={issue.story_points ?? ""}
                onChange={(e) =>
                  updateField(
                    "story_points",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">-</option>
                {[1, 2, 3, 5, 8, 13].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Start Date
              </p>
              <input
                type="date"
                className="input !py-1.5 !text-xs"
                value={issue.start_date ? issue.start_date.slice(0, 10) : ""}
                onChange={(e) =>
                  updateField("start_date", e.target.value || null)
                }
              />
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Due Date
              </p>
              <input
                type="date"
                className="input !py-1.5 !text-xs"
                value={issue.due_date ? issue.due_date.slice(0, 10) : ""}
                onChange={(e) => updateField("due_date", e.target.value || null)}
              />
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Reporter
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Avatar name={issue.reporter?.name} size="sm" />
                <span className="truncate">{issue.reporter?.name}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Assignee
              </p>
              <select
                className="input !py-1.5 !text-xs"
                value={issue.assignee?.id ?? ""}
                onChange={(e) =>
                  updateField(
                    "assignee_id",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {!isEpic && (
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                  Epic
                </p>
                <select
                  className="input !py-1.5 !text-xs"
                  value={issue.parent_id ?? ""}
                  onChange={(e) =>
                    updateField(
                      "parent_id",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">None</option>
                  {epics.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                Fix Version
              </p>
              <select
                className="input !py-1.5 !text-xs"
                value={issue.version_id ?? ""}
                onChange={(e) =>
                  updateField(
                    "version_id",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">None</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.status === "released" ? " (released)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {isEpic && (
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 font-medium">
                  Color
                </p>
                <div className="flex gap-1.5">
                  {EPIC_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateField("color", c)}
                      title={c}
                      className={`w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${
                        issue.color === c
                          ? "ring-foreground"
                          : "ring-transparent hover:ring-border"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted uppercase tracking-wider font-medium">
                Description
              </p>
              {!editingDesc && (
                <button
                  onClick={startEditDesc}
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  className="input resize-none"
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDesc}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingDesc(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={startEditDesc}
                className="text-sm whitespace-pre-wrap min-h-12 p-3 rounded-lg bg-surface-2/50 hover:bg-surface-2 cursor-text transition"
              >
                {issue.description || (
                  <span className="text-muted italic">No description — click to add</span>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted uppercase tracking-wider font-medium">
                Labels
              </p>
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                className="text-xs text-brand hover:underline font-medium"
              >
                {showLabelPicker ? "Done" : "Edit"}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-1">
              {(issue.labels ?? []).map((l) => (
                <span
                  key={l.id}
                  className="px-2 py-0.5 rounded-md text-xs text-white font-medium shadow-sm"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {(issue.labels ?? []).length === 0 && !showLabelPicker && (
                <span className="text-xs text-muted italic">No labels</span>
              )}
            </div>
            {showLabelPicker && (
              <div className="surface-card p-2 space-y-1 max-h-40 overflow-y-auto mt-2">
                {projectLabels.length === 0 && (
                  <p className="text-xs text-muted italic py-1">
                    No labels in this project yet.
                  </p>
                )}
                {projectLabels.map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-surface-2 transition"
                  >
                    <input
                      type="checkbox"
                      checked={currentLabelIds.includes(l.id)}
                      onChange={() => toggleLabel(l.id)}
                      className="accent-indigo-600"
                    />
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-sm">{l.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted uppercase tracking-wider font-medium">
                Components
              </p>
              <button
                onClick={() => setShowComponentPicker((v) => !v)}
                className="text-xs text-brand hover:underline font-medium"
              >
                {showComponentPicker ? "Done" : "Edit"}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-1">
              {(issue.components ?? []).map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  {c.name}
                </span>
              ))}
              {(issue.components ?? []).length === 0 && !showComponentPicker && (
                <span className="text-xs text-muted italic">No components</span>
              )}
            </div>
            {showComponentPicker && (
              <div className="surface-card p-2 space-y-1 max-h-40 overflow-y-auto mt-2">
                {projectComponents.length === 0 && (
                  <p className="text-xs text-muted italic py-1">
                    No components in this project yet.
                  </p>
                )}
                {projectComponents.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-surface-2 transition"
                  >
                    <input
                      type="checkbox"
                      checked={currentComponentIds.includes(c.id)}
                      onChange={() => toggleComponent(c.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <AttachmentPanel issueId={issue.id} />

          {/* Time tracking */}
          <TimeTrackingPanel issue={issue} />

          {/* Sub-tasks */}
          <SubTaskList issue={issue} />

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b border-border mb-4">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition -mb-px ${
                    tab === t.key
                      ? "border-brand text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className="ml-1.5 bg-surface-2 text-muted text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "comments" && (
              <div>
                <div className="space-y-4 mb-4">
                  {issue.comments?.length === 0 && (
                    <p className="text-xs text-muted italic text-center py-3">
                      Chưa có comment nào.
                    </p>
                  )}
                  {issue.comments?.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.author?.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-medium">
                            {c.author?.name}
                          </span>
                          <span className="text-[11px] text-muted">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {(c.author_id === user?.id) && (
                            <div className="ml-auto flex gap-2">
                              <button
                                onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.body); }}
                                className="text-[11px] text-muted hover:text-brand transition"
                              >Edit</button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-[11px] text-muted hover:text-red-500 transition"
                              >Delete</button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              rows={3}
                              className="input resize-none w-full text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateComment(c.id, editCommentText)}
                                className="text-xs gradient-brand text-white rounded px-3 py-1 font-medium"
                              >Save</button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="text-xs text-muted hover:text-foreground"
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap rounded-lg bg-surface-2/50 px-3 py-2">
                            {c.body}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <CommentBox
                  onSubmit={handleCommentSubmit}
                  submitting={submitting}
                />
              </div>
            )}

            {tab === "activity" && <ActivityFeed issueId={issue.id} />}
            {tab === "links" && <LinksPanel issue={issue} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// buildPatch converts a single-field UI mutation into the backend's
// updateIssueDTO shape, mapping null/empty into clear_* flags.
function buildPatch(field: string, value: unknown): Record<string, unknown> {
  switch (field) {
    case "assignee_id":
      return value == null ? { clear_assignee: true } : { assignee_id: value };
    case "parent_id":
      return value == null ? { clear_parent: true } : { parent_id: value };
    case "sprint_id":
      return value == null ? { clear_sprint: true } : { sprint_id: value };
    case "due_date":
      return value == null || value === ""
        ? { clear_due: true }
        : { due_date: value };
    case "start_date":
      return value == null || value === ""
        ? { clear_start: true }
        : { start_date: value };
    case "version_id":
      return value == null
        ? { clear_version: true }
        : { version_id: value };
    default:
      return { [field]: value };
  }
}
