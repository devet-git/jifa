"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useProjects } from "@/hooks/useProject";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { useRecentlyViewed } from "@/hooks/useJQL";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { IssueHoverCard } from "@/components/ui/IssueHoverCard";
import { Badge } from "@/components/ui/Badge";
import type { Issue } from "@/types";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: projects = [], isLoading } = useProjects();
  const [showCreate, setShowCreate] = useState(false);

  const { data: myIssues = [] } = useQuery<Issue[]>({
    queryKey: ["issues", { assignee_id: user?.id }],
    queryFn: () =>
      api.get(`/issues?assignee_id=${user!.id}`).then((r) => r.data),
    enabled: !!user,
  });
  const { data: unread } = useUnreadCount();
  const { data: recentNotifs = [] } = useNotifications();
  const { data: recentIssues = [] } = useRecentlyViewed();

  const openIssues = useMemo(
    () => myIssues.filter((i) => i.status !== "done"),
    [myIssues],
  );
  const doneIssues = useMemo(
    () => myIssues.filter((i) => i.status === "done"),
    [myIssues],
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero greeting */}
      <section className="relative overflow-hidden rounded-2xl gradient-brand text-white p-7 shadow-lg shadow-indigo-600/20">
        <div
          aria-hidden
          className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 60%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 60%)" }}
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1">
              {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {greeting()}, {user?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-white/85 mt-1.5 text-sm">
              Here is what is waiting for you today.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowCreate(true)}
            className="!bg-white !text-indigo-700 hover:!bg-white/90 !border-0 shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </Button>
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Open issues"
          value={openIssues.length}
          href="/my-issues"
          tint="indigo"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          }
        />
        <StatCard
          label="Unread notifications"
          value={unread?.count ?? 0}
          href="/notifications"
          tint="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          }
        />
        <StatCard
          label="Projects"
          value={projects.length}
          href="#projects"
          tint="emerald"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My open issues */}
        <section className="lg:col-span-2 surface-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">My open issues</h2>
            <Link
              href="/my-issues"
              className="text-xs text-brand hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          {openIssues.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="All caught up"
              description="You have no open issues."
            />
          ) : (
            <ul className="divide-y divide-border">
              {openIssues.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/projects/${i.project_id}`}
                    className="px-5 py-3 flex items-center gap-3 text-sm hover:bg-surface-2 transition group"
                  >
                    <span className="font-mono text-[11px] text-muted bg-surface-2 px-2 py-1 rounded shrink-0">
                      {i.key ?? `#${i.id}`}
                    </span>
                    <span className="flex-1 truncate group-hover:text-brand transition">
                      {i.title}
                    </span>
                    <Badge type="status" value={i.status} showDot />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="surface-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Recent activity</h2>
            <Link
              href="/notifications"
              className="text-xs text-brand hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          {recentNotifs.length === 0 ? (
            <EmptyState
              icon="🛎️"
              title="Nothing yet"
              description="Activity will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentNotifs.slice(0, 6).map((n) => (
                <li key={n.id} className="px-4 py-3 flex gap-3 text-xs">
                  <UserHoverCard user={n.actor} side="right" align="start">
                    <Avatar name={n.actor?.name ?? "?"} size="sm" />
                  </UserHoverCard>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">
                        {n.actor?.name ?? "Someone"}
                      </span>{" "}
                      <span className="text-muted">{verbFor(n.type)}</span>
                    </p>
                    {n.issue && (
                      <p className="text-xs text-muted truncate mt-0.5">
                        <IssueHoverCard issue={n.issue} side="right" align="start">
                          <span className="font-mono cursor-default">
                            {n.issue.key ?? `#${n.issue.id}`}
                          </span>
                        </IssueHoverCard>
                        {n.body ? ` — ${n.body}` : ""}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recently viewed */}
      {recentIssues.length > 0 && (
        <section className="surface-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="font-semibold text-sm">Recently viewed</h2>
          </div>
          <ul className="divide-y divide-border">
            {recentIssues.slice(0, 8).map((i) => (
              <li key={i.id}>
                <Link
                  href={`/projects/${i.project_id}`}
                  className="px-5 py-2.5 flex items-center gap-3 text-sm hover:bg-surface-2 transition group"
                >
                  <span className="font-mono text-[11px] text-muted bg-surface-2 px-2 py-1 rounded shrink-0">
                    {i.key ?? `#${i.id}`}
                  </span>
                  <span className="flex-1 truncate group-hover:text-brand transition">
                    {i.title}
                  </span>
                  <Badge type="status" value={i.status} showDot />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Projects grid */}
      <section id="projects">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Projects</h2>
          {projects.length > 0 && (
            <Link
              href="/projects"
              className="text-xs text-brand hover:underline font-medium"
            >
              View all →
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-32" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
            </div>
            <p className="font-medium mb-1">No projects yet</p>
            <p className="text-sm text-muted mb-4">
              Create your first project to get started.
            </p>
            <Button variant="gradient" onClick={() => setShowCreate(true)}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="group">
                <div className="surface-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="gradient-brand text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wide shrink-0 shadow-sm">
                      {p.key}
                    </span>
                    <h3 className="font-semibold truncate flex-1 group-hover:text-brand transition">
                      {p.name}
                    </h3>
                  </div>
                  {p.description ? (
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted italic">No description</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {doneIssues.length > 0 && (
        <p className="text-xs text-muted text-center pt-2">
          🎯 You closed <span className="font-medium text-foreground">{doneIssues.length}</span> issue
          {doneIssues.length === 1 ? "" : "s"} — great work!
        </p>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  tint,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  tint: "indigo" | "amber" | "emerald";
  icon: React.ReactNode;
}) {
  const tints = {
    indigo:
      "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20",
    amber:
      "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
    emerald:
      "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
  };
  return (
    <Link
      href={href}
      className="surface-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 ${tints[tint]}`}
      >
        <div className="w-5 h-5">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted mt-1">{description}</p>
    </div>
  );
}

function verbFor(t: string) {
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
    default:
      return "updated";
  }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

