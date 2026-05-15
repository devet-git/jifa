"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown } from "lucide-react";
import { useCreateIssue } from "@/hooks/useIssues";
import { useUsers } from "@/hooks/useUsers";
import { useTemplates } from "@/hooks/useTemplates";
import type { Sprint, IssueType, IssuePriority } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  sprints?: Sprint[];
}

const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
  { value: "epic", label: "Epic" },
  { value: "subtask", label: "Sub-task" },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

/* Radix Select rejects empty-string values, so use sentinels for the
   optional "no selection" rows and translate at form-submit time. */
const SPRINT_NONE = "__backlog__";
const ASSIGNEE_NONE = "__unassigned__";

export function CreateIssueModal({
  open,
  onClose,
  projectId,
  sprints = [],
}: Props) {
  const [form, setForm] = useState({
    title: "",
    type: "task" as IssueType,
    priority: "medium" as IssuePriority,
    description: "",
    story_points: "",
    sprint_id: "",
    assignee_id: "",
  });
  const { mutateAsync, isPending } = useCreateIssue();
  const { data: users = [] } = useUsers();
  const { data: templates = [] } = useTemplates(projectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync({
      ...form,
      project_id: projectId,
      story_points: form.story_points ? Number(form.story_points) : undefined,
      sprint_id: form.sprint_id ? Number(form.sprint_id) : undefined,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
    });
    setForm({
      title: "",
      type: "task",
      priority: "medium",
      description: "",
      story_points: "",
      sprint_id: "",
      assignee_id: "",
    });
    onClose();
  }

  function applyTemplate(id: number) {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      type: t.issue_type,
      title: t.title || f.title,
      description: t.description || f.description,
      priority: t.priority,
      story_points: t.story_points != null ? String(t.story_points) : f.story_points,
    }));
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Issue" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {templates.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Template
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-between"
                >
                  Apply template…
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuLabel>Templates</DropdownMenuLabel>
                {templates.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onSelect={() => applyTemplate(t.id)}
                  >
                    {t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Title
          </label>
          <input
            required
            className="input"
            placeholder="What needs to be done?"
            autoFocus
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Type
            </label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, type: v as IssueType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Priority
            </label>
            <Select
              value={form.priority}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, priority: v as IssuePriority }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Story Points
              {form.type === "story" && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <input
              required
              className="input"
              placeholder="What needs to be done?"
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                Type
              </label>
              <select
                className="input"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as IssueType }))
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                Priority
              </label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as IssuePriority,
                  }))
                }
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                Story Points{form.type === "story" && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type="number"
                min={0}
                required={form.type === "story"}
                placeholder={form.type === "story" ? "Required for Story" : "—"}
                className="input"
                value={form.story_points}
                onChange={(e) =>
                  setForm((f) => ({ ...f, story_points: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                Sprint
              </label>
              <select
                className="input"
                value={form.sprint_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sprint_id: e.target.value }))
                }
              >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Assignee
            </label>
            <select
              className="input"
              value={form.assignee_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignee_id: e.target.value }))
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
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Detailed description (optional)"
              className="input resize-none"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Sprint
            </label>
            <Select
              value={form.sprint_id || SPRINT_NONE}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, sprint_id: v === SPRINT_NONE ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SPRINT_NONE}>Backlog</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Assignee
          </label>
          <Select
            value={form.assignee_id || ASSIGNEE_NONE}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                assignee_id: v === ASSIGNEE_NONE ? "" : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ASSIGNEE_NONE}>Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Description
          </label>
          <textarea
            rows={4}
            placeholder="Detailed description (optional)"
            className="input resize-none"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border -mx-6 px-6 -mb-6 pb-6 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? "Creating…" : "Create issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
