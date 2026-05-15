"use client";

import { useEffect, useState } from "react";
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
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/Command";
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
  const router = useRouter();
  const { data } = useSearch(q);

  /* Global ⌘K / Ctrl+K opens the command palette. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const issues = data?.issues ?? [];
  const projects = data?.projects ?? [];

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQ("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center w-[420px] max-w-full bg-surface border border-border rounded-[10px] hover:border-[var(--border-strong)] transition text-left px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <svg
          className="mr-2 w-4 h-4 text-muted shrink-0"
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
        <span className="flex-1 text-sm text-muted-2 truncate">
          Search issues, projects…
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
      >
        <CommandInput
          placeholder="Search issues, projects…"
          value={q}
          onValueChange={setQ}
          autoFocus
        />
        <CommandList>
          <CommandEmpty>
            {q.trim() ? "No results found." : "Type to search…"}
          </CommandEmpty>
          {issues.length > 0 && (
            <CommandGroup heading="Issues">
              {issues.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`${i.key ?? `#${i.id}`} ${i.title}`}
                  onSelect={() => go(`/projects/${i.project_id}`)}
                >
                  <span className="font-mono text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0">
                    {i.key ?? `#${i.id}`}
                  </span>
                  <span className="truncate">{i.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {issues.length > 0 && projects.length > 0 && <CommandSeparator />}
          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.key} ${p.name}`}
                  onSelect={() => go(`/projects/${p.id}`)}
                >
                  <span className="font-mono text-[11px] bg-brand-soft text-brand-strong rounded px-1.5 py-0.5 shrink-0">
                    {p.key}
                  </span>
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
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
      <Tooltip content="Notifications">
      <PopoverTrigger asChild>
        <button
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
      </Tooltip>
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
      <UserHoverCard user={n.actor} side="left" align="start">
        <Avatar name={n.actor?.name ?? "?"} size="sm" />
      </UserHoverCard>
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
        <p className="text-xs text-muted mt-1">
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
