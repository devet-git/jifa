"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useNotifications,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { IssueHoverCard } from "@/components/ui/IssueHoverCard";
import { Button } from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";

const verb = {
  comment: "commented on",
  mention: "mentioned you in",
  assigned: "assigned you to",
  status_change: "moved",
  link_added: "linked",
} as const;

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: notifs = [], isLoading } = useNotifications({ unreadOnly });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted mt-1">
            Activity sent to you from your projects.
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
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b border-border">
                <SkeletonRow />
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <EmptyState
            icon={defaultIcons.sprint}
            title="All caught up"
            description={`You have no ${unreadOnly ? "unread " : ""}notifications.`}
          />
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
                <UserHoverCard user={n.actor} side="right" align="start">
                  <Avatar name={n.actor?.name ?? "?"} src={n.actor?.avatar} size="md" />
                </UserHoverCard>
                <div className="flex-1 min-w-0">
                  <p className="leading-snug">
                    <span className="font-medium">
                      {n.actor?.name ?? "Someone"}
                    </span>{" "}
                    <span className="text-muted">{verb[n.type]}</span>{" "}
                    {n.issue && (
                      <IssueHoverCard issue={n.issue} side="top" align="start">
                        <span className="font-mono text-xs text-muted cursor-default">
                          {n.issue.key ?? `#${n.issue.id}`}
                        </span>
                      </IssueHoverCard>
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
