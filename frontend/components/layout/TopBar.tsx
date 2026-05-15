"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import type { Notification } from "@/types";

export function TopBar() {
  return (
    <div className="h-14 sticky top-0 z-30 flex items-center px-5 gap-4 glass border-b border-border">
      <SearchBox />
      <div className="flex-1" />
      <BellMenu />
    </div>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data } = useSearch(q);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const issues = data?.issues ?? [];
  const projects = data?.projects ?? [];
  const hasResults = issues.length > 0 || projects.length > 0;

  return (
    <div ref={ref} className="relative w-[420px] max-w-full">
      <div className="relative flex items-center bg-surface border border-border rounded-[10px] hover:border-[var(--border-strong)] focus-within:border-brand focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_18%,transparent)] transition">
        <svg
          className="ml-3 mr-2 w-4 h-4 text-muted shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search issues, projects…"
          className="flex-1 min-w-0 bg-transparent text-sm py-2 pr-2 outline-none placeholder:text-[var(--muted-2)]"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <div className="flex items-center gap-1 pr-2.5 pointer-events-none">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </div>
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 mt-2 surface-elevated max-h-96 overflow-auto z-40 animate-slide-down">
          {!hasResults ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              No results for <span className="font-medium">&ldquo;{q}&rdquo;</span>
            </p>
          ) : (
            <>
              {issues.length > 0 && (
                <div className="py-1">
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted">
                    Issues
                  </p>
                  {issues.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => {
                        router.push(`/projects/${i.project_id}`);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-3 text-sm transition"
                    >
                      <span className="font-mono text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0">
                        {i.key ?? `#${i.id}`}
                      </span>
                      <span className="truncate">{i.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {projects.length > 0 && (
                <div className="py-1 border-t border-border">
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted">
                    Projects
                  </p>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        router.push(`/projects/${p.id}`);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-3 text-sm transition"
                    >
                      <span className="font-mono text-[11px] bg-brand-soft text-brand-strong rounded px-1.5 py-0.5 shrink-0">
                        {p.key}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BellMenu() {
  const [open, setOpen] = useState(false);
  const { data: count } = useUnreadCount();
  const { data: notifs = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const unread = count?.count ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Notifications"
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="!p-0 w-96 max-h-[480px] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <p className="text-[11px] text-muted mt-0.5">{unread} unread</p>
            )}
          </div>
          <button
            onClick={() => markAll.mutate()}
            className="text-xs text-brand hover:underline disabled:opacity-40 disabled:no-underline font-medium"
            disabled={!unread}
          >
            Mark all read
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </div>
              <p className="text-xs text-muted">No notifications yet</p>
            </div>
          ) : (
            notifs.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onMarkRead={() => markRead.mutate(n.id)}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </div>
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block px-4 py-2.5 text-center text-xs font-medium text-brand border-t border-border hover:bg-surface-2 transition"
        >
          See all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  n,
  onMarkRead,
  onClose,
}: {
  n: Notification;
  onMarkRead: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const isUnread = !n.read_at;
  function click() {
    if (isUnread) onMarkRead();
    if (n.issue?.project_id) {
      router.push(`/projects/${n.issue.project_id}`);
    }
    onClose();
  }
  return (
    <button
      onClick={click}
      className={`w-full text-left px-4 py-3 flex gap-3 border-b border-border text-sm hover:bg-surface-2 transition ${
        isUnread ? "bg-brand-soft/40" : ""
      }`}
    >
      <Avatar name={n.actor?.name ?? "?"} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{n.actor?.name ?? "Someone"}</span>{" "}
          <span className="text-muted">{verbFor(n.type)}</span>{" "}
          {n.issue && (
            <span className="font-mono text-xs text-muted">
              {n.issue.key ?? `#${n.issue.id}`}
            </span>
          )}
        </p>
        {n.body && (
          <p className="text-xs text-muted truncate mt-0.5">{n.body}</p>
        )}
        <p className="text-[11px] text-muted mt-1">
          {new Date(n.created_at).toLocaleString()}
        </p>
      </div>
      {isUnread && (
        <span className="w-2 h-2 bg-brand rounded-full self-center shrink-0" />
      )}
    </button>
  );
}

function verbFor(t: Notification["type"]) {
  switch (t) {
    case "comment":
      return "commented on";
    case "mention":
      return "mentioned you in";
    case "assigned":
      return "assigned you to";
    case "status_change":
      return "moved";
    case "link_added":
      return "linked";
  }
}
