"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject, useUnarchiveProject } from "@/hooks/useProject";
import { useMyPermissions } from "@/hooks/usePermissions";
import { usePermissionsStore } from "@/store/permissions";
import { MyPermissionsModal } from "@/components/permissions/MyPermissionsModal";
import { ProjectFormatProvider } from "@/lib/projectFormat";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

export default function ProjectTabbedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { data: project, isLoading } = useProject(id);
  const { data: myPermKeys } = useMyPermissions(id);
  const [showPerms, setShowPerms] = useState(false);
  const unarchive = useUnarchiveProject();
  const canRestore = myPermKeys?.includes("project.edit") ?? false;

  async function handleUnarchive() {
    try {
      await unarchive.mutateAsync(id);
      toast("Project restored", "success");
    } catch {}
  }

  useEffect(() => {
    usePermissionsStore.getState().clear();
    if (myPermKeys) {
      usePermissionsStore.getState().setPerms(Number(id), myPermKeys);
    }
  }, [id, myPermKeys]);

  const tabs: { key: string; label: string; href: string }[] = [
    { key: "backlog", label: "Backlog", href: `/projects/${id}` },
    { key: "board", label: "Board", href: `/projects/${id}/board` },
    { key: "sprints", label: "Sprints", href: `/projects/${id}/sprints` },
    { key: "epics", label: "Epics", href: `/projects/${id}/epics` },
    { key: "roadmap", label: "Roadmap", href: `/projects/${id}/roadmap` },
    { key: "reports", label: "Reports", href: `/projects/${id}/reports` },
    { key: "versions", label: "Releases", href: `/projects/${id}/versions` },
    { key: "calendar", label: "Calendar", href: `/projects/${id}/calendar` },
    { key: "planning", label: "Planning", href: `/projects/${id}/planning` },
    { key: "wiki", label: "Wiki", href: `/projects/${id}/wiki` },
  ];

  const segments = pathname.split("/").filter(Boolean);
  const rawTab = segments[2] || "backlog";
  const activeTab = rawTab === "boards" ? "board" : rawTab;

  return (
    <div className="flex flex-col h-full">
      {project?.archived_at && (
        <div className="px-8 py-2 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-3 shrink-0">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="3" width="18" height="6" rx="1" />
            <path d="M21 9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
            <line x1="10" y1="13" x2="14" y2="13" />
          </svg>
          <span className="flex-1">
            This project is archived — read-only.
            {!canRestore && (
              <> Ask a project admin to restore it.</>
            )}
          </span>
          {canRestore && (
            <button
              onClick={handleUnarchive}
              disabled={unarchive.isPending}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 transition disabled:opacity-60 shrink-0"
            >
              {unarchive.isPending ? "Restoring…" : "Unarchive"}
            </button>
          )}
        </div>
      )}
      <div className="px-8 pt-4 pb-0 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 mb-2">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-12 rounded-md" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            </>
          ) : (
            <>
              <span className="gradient-brand text-white font-bold px-2 py-0.5 rounded-md text-[11px] tracking-wide shrink-0 shadow-sm">
                {project?.key}
              </span>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">
                  {project?.name}
                </h1>
                {project?.description && (
                  <p className="text-[11px] text-muted truncate">
                    {project.description}
                  </p>
                )}
              </div>
            </>
          )}
          <button
            onClick={() => setShowPerms(true)}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground hover:bg-surface-2 px-2 py-1 rounded-lg transition"
            title="View My Permissions"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
            Permission
          </button>
          <Link
            href={`/projects/${id}/settings`}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground hover:bg-surface-2 px-2 py-1 rounded-lg transition"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            Settings
          </Link>
        </div>
        <div className="flex gap-0.5 -mb-px overflow-x-auto">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 animate-fade-in">
        <ProjectFormatProvider
          dateFormat={project?.date_format}
          timeFormat={project?.time_format}
        >
          {children}
        </ProjectFormatProvider>
      </div>
      <MyPermissionsModal
        open={showPerms}
        onClose={() => setShowPerms(false)}
        projectName={project?.name}
      />
    </div>
  );
}
