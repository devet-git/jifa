"use client";

import { use, useState } from "react";
import Link from "next/link";
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

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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
    if (!confirm("Delete this page?")) return;
    await deletePage.mutateAsync(pageId);
    if (selectedId === pageId) setSelectedId(null);
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand transition mb-2"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {project?.name}
          </Link>
          <h2 className="text-sm font-semibold">Wiki</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => openPage(p)}
              className={`w-full text-left px-4 py-2 text-sm transition truncate flex items-center gap-2 group ${
                selectedId === p.id
                  ? "bg-brand-soft text-brand font-medium"
                  : "hover:bg-surface-2 text-foreground"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="flex-1 truncate">{p.title}</span>
              <span
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                className="opacity-0 group-hover:opacity-100 transition text-muted hover:text-red-500 p-0.5 rounded"
                title="Delete page"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          ))}
          {pages.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted italic">No pages yet.</p>
          )}
        </div>
        <div className="p-3 border-t border-border">
          {creating ? (
            <form onSubmit={handleCreate} className="space-y-1.5">
              <input
                autoFocus
                className="input !py-1 !text-xs w-full"
                placeholder="Page title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={createPage.isPending}
                  className="flex-1 text-xs gradient-brand text-white rounded-md py-1 font-medium disabled:opacity-60"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewTitle(""); }}
                  className="text-xs text-muted hover:text-foreground px-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full text-xs text-muted hover:text-foreground flex items-center gap-1.5 py-1 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New page
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {selectedId ? (
          <WikiPageView
            projectId={id}
            pageId={selectedId}
            editing={editing}
            onEditToggle={() => setEditing((v) => !v)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center p-12">
            <div>
              <div className="mx-auto w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="font-medium mb-1">Project wiki</p>
              <p className="text-sm text-muted">
                Select a page or create a new one to get started.
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
}: {
  projectId: string;
  pageId: number;
  editing: boolean;
  onEditToggle: () => void;
}) {
  const { data: page, isLoading } = useWikiPage(projectId, pageId);
  const updatePage = useUpdateWikiPage(projectId);
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);

  if (isLoading || !page) {
    return (
      <div className="p-8 text-sm text-muted animate-pulse">Loading…</div>
    );
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
      <form onSubmit={save} className="flex flex-col h-full p-6 gap-4">
        <input
          className="input text-lg font-semibold !py-2"
          value={draft.title}
          onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : d)}
          placeholder="Page title"
        />
        <div className="flex-1">
          <MarkdownEditor
            value={draft.content}
            onChange={(v) => setDraft((d) => d ? { ...d, content: v } : d)}
            rows={18}
            placeholder="Write in Markdown…"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="submit"
            disabled={updatePage.isPending}
            className="gradient-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="text-sm px-4 py-2 rounded-lg ring-1 ring-border text-muted hover:text-foreground hover:bg-surface-2 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
        <button
          onClick={startEdit}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg ring-1 ring-border text-muted hover:text-foreground hover:bg-surface-2 transition inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      </div>

      {page.author && (
        <div className="flex items-center gap-2 mb-6 text-xs text-muted">
          <Avatar name={page.author.name} size="sm" />
          <span>{page.author.name}</span>
          <span>·</span>
          <span>Updated {new Date(page.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}

      {page.content ? (
        <MarkdownBody content={page.content} />
      ) : (
        <p className="text-sm text-muted italic">
          This page is empty.{" "}
          <button onClick={startEdit} className="text-brand hover:underline">
            Add content
          </button>
        </p>
      )}
    </div>
  );
}

