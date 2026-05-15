"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { showConfirm } from "@/store/confirm";
import { usePermissionsStore } from "@/store/permissions";
import { useProject } from "@/hooks/useProject";
import {
  useWikiPages,
  useWikiPage,
  useCreateWikiPage,
  useUpdateWikiPage,
  useDeleteWikiPage,
} from "@/hooks/useWiki";
import { Avatar } from "@/components/ui/Avatar";
import { MarkdownEditor, MarkdownBody } from "@/components/ui/MarkdownEditor";
import type { WikiPage } from "@/types";

type Sort = "alpha" | "recent";

const SORT_LABELS: Record<Sort, string> = { alpha: "A–Z", recent: "Recent" };

export default function WikiListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const { data: pages = [] } = useWikiPages(id);
  const createPage = useCreateWikiPage(id);
  const deletePage = useDeleteWikiPage(id);
  const can = usePermissionsStore((s) => s.can);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("alpha");

  function openPage(page: WikiPage) {
    setSelectedId(page.id);
    setEditing(false);
    setCreating(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const page = await createPage.mutateAsync({ title, content: "" });
    setNewTitle("");
    setCreating(false);
    setSelectedId(page.id);
    setEditing(true);
  }

  async function handleDelete(pageId: number) {
    if (!(await showConfirm({ message: "Delete this page?", variant: "danger" }))) return;
    await deletePage.mutateAsync(pageId);
    if (selectedId === pageId) setSelectedId(null);
  }

  const filtered = useMemo(() => {
    let result = pages;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    const sorted = [...result];
    if (sort === "alpha") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return sorted;
  }, [pages, search, sort]);

  const selectedPage = pages.find((p) => p.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Wiki</h2>
            <span className="text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded-full tabular-nums">
              {pages.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <svg className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input !py-1 !text-xs w-full !pl-6"
                placeholder="Filter pages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative group">
              <button className="text-xs text-muted hover:text-foreground px-1.5 py-1 rounded transition">
                {SORT_LABELS[sort]}
              </button>
              <div className="absolute right-0 top-full mt-0.5 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[100px] hidden group-hover:block z-20">
                {(["alpha", "recent"] as Sort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`w-full text-left px-3 py-1 text-xs transition ${
                      sort === s ? "text-brand font-medium" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {SORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted italic text-center">
              {search ? "No pages match your filter." : "No pages yet."}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openPage(p)}
                className={`w-full text-left px-4 py-2 text-sm transition group ${
                  selectedId === p.id
                    ? "bg-brand-soft/60 text-brand font-medium"
                    : "hover:bg-surface-2 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{p.title}</span>
                    <span className="block text-[10px] text-muted mt-0.5">
                      {timeAgo(p.updated_at)}
                    </span>
                  </div>
                  {can("wiki.delete") && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="opacity-0 group-hover:opacity-100 transition text-muted hover:text-red-500 p-0.5 rounded"
                    title="Delete page"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {can("wiki.create") && (
        <div className="p-3 border-t border-border">
          {creating ? (
            <form onSubmit={handleCreate} className="space-y-1.5">
              <input
                autoFocus
                className="input !py-1.5 !text-xs w-full"
                placeholder="Page title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setCreating(false); setNewTitle(""); }
                }}
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={createPage.isPending || !newTitle.trim()}
                  className="flex-1 text-xs gradient-brand text-white rounded-md py-1.5 font-medium disabled:opacity-60 transition"
                >
                  {createPage.isPending ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewTitle(""); }}
                  className="text-xs text-muted hover:text-foreground px-2 py-1 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full text-xs text-muted hover:text-foreground flex items-center justify-center gap-1.5 py-2 rounded-lg ring-1 ring-border hover:bg-surface-2 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New page
            </button>
          )}
        </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {selectedId && selectedPage ? (
          <WikiPageView
            projectId={id}
            pageId={selectedId}
            editing={editing}
            onEditToggle={() => setEditing((v) => !v)}
            onDeleted={() => { setSelectedId(null); }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center p-12">
            <div>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <p className="font-semibold text-foreground mb-1">Project wiki</p>
              <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
                {pages.length === 0
                  ? "Create your first page to start documenting your project."
                  : "Select a page from the sidebar or create a new one."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WikiPageView({
  projectId,
  pageId,
  editing,
  onEditToggle,
  onDeleted,
}: {
  projectId: string;
  pageId: number;
  editing: boolean;
  onEditToggle: () => void;
  onDeleted: () => void;
}) {
  const { data: project } = useProject(projectId);
  const { data: page, isLoading } = useWikiPage(projectId, pageId);
  const updatePage = useUpdateWikiPage(projectId);
  const deletePage = useDeleteWikiPage(projectId);
  const can = usePermissionsStore((s) => s.can);
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl animate-pulse space-y-4">
        <div className="h-5 w-32 skeleton rounded" />
        <div className="h-8 w-64 skeleton rounded" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full skeleton" />
          <div className="h-3 w-40 skeleton rounded" />
        </div>
        <div className="space-y-2 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 skeleton rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-center p-12">
        <p className="text-sm text-muted">Page not found.</p>
      </div>
    );
  }

  async function handleDelete() {
    if (!page) return;
    if (!(await showConfirm({ message: `Delete "${page.title}"?`, variant: "danger" }))) return;
    await deletePage.mutateAsync(page.id);
    onDeleted();
  }

  function startEdit() {
    setDraft({ title: page!.title, content: page!.content ?? "" });
    onEditToggle();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    await updatePage.mutateAsync({ id: page!.id, ...draft });
    onEditToggle();
    setDraft(null);
  }

  function cancel() {
    setDraft(null);
    onEditToggle();
  }

  if (editing && draft) {
    return (
      <form onSubmit={save} className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <Link href={`/projects/${projectId}`} className="hover:text-foreground transition">Wiki</Link>
            <span>/</span>
            <span className="text-foreground">Editing</span>
          </div>
          <input
            className="input text-lg font-semibold !py-2"
            value={draft.title}
            onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : d)}
            placeholder="Page title"
          />
          <div className="flex-1 min-h-[300px]">
            <MarkdownEditor
              value={draft.content}
              onChange={(v) => setDraft((d) => d ? { ...d, content: v } : d)}
              rows={18}
              placeholder="Write in Markdown…"
            />
          </div>
        </div>
        <div className="shrink-0 px-6 py-3 border-t border-border bg-surface flex items-center justify-between">
          <span className="text-[11px] text-muted">
            {draft.content.length} character{draft.content.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="text-sm px-4 py-2 rounded-lg ring-1 ring-border text-muted hover:text-foreground hover:bg-surface-2 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePage.isPending}
              className="gradient-brand text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-60 transition inline-flex items-center gap-1.5"
            >
              {updatePage.isPending ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              {updatePage.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted mb-4">
        <Link href={`/projects/${projectId}`} className="hover:text-foreground transition">
          {project?.name ?? "Project"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Wiki</span>
      </div>

      {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {can("wiki.edit") && (
            <button
              onClick={startEdit}
              className="text-xs px-3 py-1.5 rounded-lg gradient-brand text-white font-medium inline-flex items-center gap-1.5 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            )}
            {can("wiki.delete") && (
            <button
              onClick={handleDelete}
              title="Delete page"
              className="text-xs px-2.5 py-1.5 rounded-lg ring-1 ring-border text-muted hover:text-red-500 hover:ring-red-500/30 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            )}
          </div>
        </div>

      {/* Author & date */}
      {page.author && (
        <div className="flex items-center gap-2.5 mb-7 text-xs text-muted">
          <Avatar name={page.author.name} size="sm" />
          <span className="font-medium text-foreground">{page.author.name}</span>
          <span>·</span>
          <span>Updated {timeAgo(page.updated_at)}</span>
        </div>
      )}

      {/* Content */}
      {page.content ? (
        <div className="prose prose-sm max-w-none">
          <MarkdownBody content={page.content} />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted mb-3">This page is empty.</p>
          {can("wiki.edit") && (
          <button
            onClick={startEdit}
            className="text-sm gradient-brand text-white font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Add content
          </button>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
