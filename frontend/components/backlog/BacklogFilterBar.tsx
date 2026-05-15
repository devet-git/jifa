"use client";

import { useEffect, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useLabels } from "@/hooks/useLabels";
import { useFilters, useCreateFilter, useDeleteFilter } from "@/hooks/useFilters";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown } from "lucide-react";
import type {
  BacklogFilterState,
  IssuePriority,
  IssueType,
} from "@/types";

interface Props {
  projectId: number | string;
  value: BacklogFilterState;
  onChange: (v: BacklogFilterState) => void;
}

const TYPES: IssueType[] = ["task", "bug", "story", "epic"];
const PRIORITIES: IssuePriority[] = ["low", "medium", "high", "urgent"];

export function BacklogFilterBar({ projectId, value, onChange }: Props) {
  const { data: users = [] } = useUsers();
  const { data: labels = [] } = useLabels(projectId);
  const { data: filters = [] } = useFilters(projectId);
  const createFilter = useCreateFilter();
  const deleteFilter = useDeleteFilter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [jqlMode, setJqlMode] = useState(() => !!value.jql);

  useEffect(() => {
    if (value.jql) setJqlMode(true);
  }, [value.jql]);

  function toggle<T extends number | string>(
    arr: T[] | undefined,
    item: T,
  ): T[] {
    const set = new Set(arr ?? []);
    set.has(item) ? set.delete(item) : set.add(item);
    return Array.from(set);
  }

  const activeCount =
    (value.assignee_ids?.length ?? 0) +
    (value.types?.length ?? 0) +
    (value.priorities?.length ?? 0) +
    (value.label_ids?.length ?? 0) +
    (value.q ? 1 : 0) +
    (value.jql ? 1 : 0);

  async function handleSave() {
    if (!saveName.trim()) return;
    await createFilter.mutateAsync({
      name: saveName.trim(),
      project_id: Number(projectId),
      query: JSON.stringify(value),
    });
    setSaveName("");
    setSaveOpen(false);
  }

  function applyFilter(jsonQuery: string) {
    try {
      onChange(JSON.parse(jsonQuery));
    } catch {
      onChange({});
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!jqlMode && (
          <div className="flex items-center bg-surface border border-border rounded-lg hover:border-[var(--border-strong)] focus-within:border-brand transition w-56">
            <svg className="ml-2.5 w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Filter by text…"
              className="flex-1 min-w-0 bg-transparent text-xs px-2 py-1.5 outline-none placeholder:text-[var(--muted-2)]"
              value={value.q ?? ""}
              onChange={(e) =>
                onChange({ ...value, q: e.target.value || undefined })
              }
            />
          </div>
        )}

        {!jqlMode && (
          <>
            <DropdownMulti
              label="Assignee"
              count={value.assignee_ids?.length ?? 0}
              options={users.map((u) => ({
                id: u.id,
                label: u.name,
                avatar: u.name,
              }))}
              selected={value.assignee_ids ?? []}
              onToggle={(id) =>
                onChange({
                  ...value,
                  assignee_ids: toggle(value.assignee_ids, id as number),
                })
              }
            />
            <DropdownMulti
              label="Type"
              count={value.types?.length ?? 0}
              options={TYPES.map((t) => ({ id: t, label: t }))}
              selected={value.types ?? []}
              onToggle={(id) =>
                onChange({ ...value, types: toggle(value.types, id as IssueType) })
              }
            />
            <DropdownMulti
              label="Priority"
              count={value.priorities?.length ?? 0}
              options={PRIORITIES.map((p) => ({ id: p, label: p }))}
              selected={value.priorities ?? []}
              onToggle={(id) =>
                onChange({
                  ...value,
                  priorities: toggle(value.priorities, id as IssuePriority),
                })
              }
            />
            <DropdownMulti
              label="Labels"
              count={value.label_ids?.length ?? 0}
              options={labels.map((l) => ({
                id: l.id,
                label: l.name,
                color: l.color,
              }))}
              selected={value.label_ids ?? []}
              onToggle={(id) =>
                onChange({
                  ...value,
                  label_ids: toggle(value.label_ids, id as number),
                })
              }
            />
          </>
        )}

        <button
          onClick={() => {
            const next = !jqlMode;
            setJqlMode(next);
            if (!next) onChange({ ...value, jql: undefined });
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ring-1 ${
            jqlMode || value.jql
              ? "bg-brand-soft text-brand-strong ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
              : "bg-surface text-foreground ring-border hover:bg-surface-2"
          }`}
        >
          JQL
        </button>

        {activeCount > 0 && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-muted hover:text-foreground transition px-2 py-1 rounded hover:bg-surface-2"
          >
            Clear all
          </button>
        )}

        <div className="flex-1" />

        {/* Saved filters dropdown */}
        {filters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="!text-xs">
                Saved filters
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Apply a saved filter</DropdownMenuLabel>
              {filters.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onSelect={() => applyFilter(f.query)}
                >
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {activeCount > 0 && (
          <button
            onClick={() => setSaveOpen((v) => !v)}
            className="text-xs text-brand hover:underline font-medium"
          >
            {saveOpen ? "Cancel" : "Save filter"}
          </button>
        )}
      </div>

      {jqlMode && (
        <div className="flex items-center bg-surface border border-border rounded-lg hover:border-[var(--border-strong)] focus-within:border-brand transition">
          <span className="ml-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider shrink-0 select-none">JQL</span>
          <input
            type="text"
            placeholder='type = "bug" AND priority = "high" ORDER BY created_at DESC'
            className="flex-1 min-w-0 bg-transparent text-xs px-2 py-2 outline-none placeholder:text-[var(--muted-2)] font-mono"
            autoFocus
            value={value.jql ?? ""}
            onChange={(e) => onChange({ ...value, jql: e.target.value || undefined })}
          />
        </div>
      )}

      {saveOpen && (
        <div className="flex gap-2 items-center">
          <input
            placeholder="Filter name"
            className="input !py-1.5 !text-xs flex-1 max-w-xs"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim() || createFilter.isPending}
            className="text-xs gradient-brand text-white rounded-md px-3 py-1.5 disabled:opacity-50 font-medium"
          >
            Save
          </button>
        </div>
      )}

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 text-xs bg-surface-2 ring-1 ring-border rounded-full pl-2.5 pr-1 py-0.5"
            >
              <button
                onClick={() => applyFilter(f.query)}
                className="hover:text-brand transition"
              >
                {f.name}
              </button>
              <button
                onClick={() => deleteFilter.mutate(f.id)}
                aria-label="Remove filter"
                className="w-4 h-4 rounded-full flex items-center justify-center text-muted hover:text-red-500 hover:bg-surface transition"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownMulti({
  label,
  count,
  options,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  options: { id: number | string; label: string; avatar?: string; color?: string }[];
  selected: (number | string)[];
  onToggle: (id: number | string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ring-1 ${
          count > 0
            ? "bg-brand-soft text-brand-strong ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
            : "bg-surface text-foreground ring-border hover:bg-surface-2"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="font-semibold bg-white/60 dark:bg-black/20 px-1 rounded">
            {count}
          </span>
        )}
        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 mt-2 surface-elevated w-56 max-h-64 overflow-auto z-20 animate-slide-down">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">
                Nothing available.
              </p>
            ) : (
              options.map((opt) => {
                const checked = selected.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-surface-2 text-sm transition"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(opt.id)}
                    />
                    {opt.avatar && <Avatar name={opt.avatar} size="sm" />}
                    {opt.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
