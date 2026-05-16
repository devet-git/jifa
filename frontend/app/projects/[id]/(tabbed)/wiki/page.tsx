"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { showConfirm } from "@/store/confirm";
import { usePermissionsStore } from "@/store/permissions";
import { useAuthStore } from "@/store/auth";
import { useProject } from "@/hooks/useProject";
import {
  useWikiPages,
  useWikiPage,
  useCreateWikiPage,
  useUpdateWikiPage,
  useDeleteWikiPage,
} from "@/hooks/useWiki";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Spinner } from "@/components/ui/Spinner";
import { Tooltip } from "@/components/ui/Tooltip";
import { MarkdownEditor, MarkdownBody } from "@/components/ui/MarkdownEditor";
import { SkeletonArticle } from "@/components/ui/Skeleton";
import { BookOpen, FileText, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
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
  const { data: pages = [], isLoading: pagesLoading } = useWikiPages(id);
  const createPage = useCreateWikiPage(id);
  const deletePage = useDeleteWikiPage(id);
  const can = usePermissionsStore((s) => s.can);
  const currentUserId = useAuthStore((s) => s.user?.id);

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
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
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
          {pagesLoading ? (
            <div className="px-3 py-2 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-1 py-1.5">
                  <div className="skeleton h-3 w-3 rounded shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div
                      className="skeleton h-3 rounded"
                      style={{ width: `${72 - (i % 4) * 10}%` }}
                    />
                    <div className="skeleton h-2 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
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
                  <FileText className="w-3.5 h-3.5 shrink-0 text-muted" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{p.title}</span>
                    <span className="block text-[10px] text-muted mt-0.5 truncate">
                      {p.author && p.author_id !== currentUserId
                        ? `${p.author.name} · ${timeAgo(p.updated_at)}`
                        : timeAgo(p.updated_at)}
                    </span>
                  </div>
                  {(can("wiki.delete") || p.author_id === currentUserId) && (
                    <Tooltip content="Delete page">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        aria-label="Delete page"
                        role="button"
                        className="opacity-0 group-hover:opacity-100 transition text-muted hover:text-red-500 p-0.5 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </Tooltip>
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
              <Plus className="w-3.5 h-3.5" />
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
                <BookOpen className="w-7 h-7 text-muted" />
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
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthor = !!page && page.author_id === currentUserId;
  const canEdit = can("wiki.edit") || isAuthor;
  const canDelete = can("wiki.delete") || isAuthor;
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);

  if (isLoading) {
    return <SkeletonArticle className="p-8 max-w-3xl" />;
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
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {updatePage.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="p-8">
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
            {canEdit && (
            <button
              onClick={startEdit}
              className="text-xs px-3 py-1.5 rounded-lg gradient-brand text-white font-medium inline-flex items-center gap-1.5 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            )}
            {canDelete && (
              <Tooltip content="Delete page">
                <button
                  onClick={handleDelete}
                  aria-label="Delete page"
                  className="text-xs px-2.5 py-1.5 rounded-lg ring-1 ring-border text-muted hover:text-red-500 hover:ring-red-500/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

      {/* Author & date */}
      {page.author && (
        <div className="flex items-center gap-2.5 mb-7 text-xs text-muted">
          <UserHoverCard user={page.author} side="bottom" align="start">
            <Avatar name={page.author.name} src={page.author.avatar} size="sm" />
          </UserHoverCard>
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
          {canEdit && (
          <button
            onClick={startEdit}
            className="text-sm gradient-brand text-white font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
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
