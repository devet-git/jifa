"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useNotifications,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

const verb = {
  comment: "commented on",
  mention: "mentioned you in",
  assigned: "assigned you to",
  status_change: "moved",
  link_added: "linked",
} as const;

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: notifs = [] } = useNotifications({ unreadOnly });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted mt-1">
            Hoạt động được gửi đến bạn từ các dự án.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => markAll.mutate()}>
          Mark all read
        </Button>
      </div>

      <div className="inline-flex p-1 bg-surface-2 rounded-lg mb-4 ring-1 ring-border">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
            !unreadOnly
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
            unreadOnly
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Unread
        </button>
      </div>

      <div className="surface-card overflow-hidden">
        {notifs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
            </div>
            <p className="font-medium">All caught up</p>
            <p className="text-sm text-muted mt-1">
              Bạn không có thông báo nào{unreadOnly ? " chưa đọc" : ""}.
            </p>
          </div>
        ) : (
          notifs.map((n) => {
            const href = n.issue?.project_id
              ? `/projects/${n.issue.project_id}`
              : "#";
            return (
              <Link
                key={n.id}
                href={href}
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                }}
                className={`flex gap-3 px-4 py-3 border-b border-border text-sm hover:bg-surface-2 transition ${
                  !n.read_at ? "bg-brand-soft/40" : ""
                }`}
              >
                <Avatar name={n.actor?.name ?? "?"} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="leading-snug">
                    <span className="font-medium">
                      {n.actor?.name ?? "Someone"}
                    </span>{" "}
                    <span className="text-muted">{verb[n.type]}</span>{" "}
                    {n.issue && (
                      <span className="font-mono text-xs text-muted">
                        {n.issue.key ?? `#${n.issue.id}`}
                      </span>
                    )}
                  </p>
                  {n.body && (
                    <p className="text-sm text-muted mt-1 truncate">{n.body}</p>
                  )}
                  <p className="text-xs text-muted mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read_at && (
                  <span className="w-2 h-2 bg-brand rounded-full self-center shrink-0" />
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
