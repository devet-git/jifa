"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/useProject";
import { useIssues } from "@/hooks/useIssues";
import { useSprints, useSprintAction } from "@/hooks/useSprints";
import { BacklogView } from "@/components/backlog/BacklogView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { CreateSprintModal } from "@/components/sprints/CreateSprintModal";
import { IssueDetail } from "@/components/issues/IssueDetail";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Issue } from "@/types";

type Tab =
  | "backlog"
  | "board"
  | "sprints"
  | "epics"
  | "roadmap"
  | "reports"
  | "versions";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("backlog");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);

  const { data: project } = useProject(id);
  const { data: backlog = [] } = useIssues({ project_id: id, sprint_id: null });
  const { data: sprints = [] } = useSprints(id);
  const sprintAction = useSprintAction();

  const activeSprint = sprints.find((s) => s.status === "active");

  const tabs: { key: Tab; label: string; href?: string }[] = [
    { key: "backlog", label: "Backlog" },
    { key: "board", label: "Board" },
    { key: "sprints", label: "Sprints" },
    { key: "epics", label: "Epics", href: `/projects/${id}/epics` },
    { key: "roadmap", label: "Roadmap", href: `/projects/${id}/roadmap` },
    { key: "reports", label: "Reports", href: `/projects/${id}/reports` },
    { key: "versions", label: "Releases", href: `/projects/${id}/versions` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-7 pb-0 border-b border-border bg-surface">
        <div className="flex items-center gap-3 mb-5">
          <span className="gradient-brand text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wide shrink-0 shadow-sm">
            {project?.key}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{project?.name}</h1>
            {project?.description && (
              <p className="text-xs text-muted mt-0.5 truncate">{project.description}</p>
            )}
          </div>
          <Link
            href={`/projects/${id}/settings`}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-2 px-3 py-1.5 rounded-lg transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            Settings
          </Link>
        </div>
        <div className="flex gap-0.5 -mb-px overflow-x-auto">
          {tabs.map((t) => {
            const active = !t.href && tab === t.key;
            const cls = `px-3.5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              active
                ? "border-brand text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`;
            return t.href ? (
              <Link key={t.key} href={t.href} className={cls}>
                {t.label}
              </Link>
            ) : (
              <button key={t.key} onClick={() => setTab(t.key)} className={cls}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Backlog */}
        {tab === "backlog" && (
          <BacklogView
            projectId={id}
            sprints={sprints}
            backlog={backlog}
            onCreateIssue={() => setShowCreateIssue(true)}
            onCreateSprint={() => setShowCreateSprint(true)}
            onIssueClick={setSelectedIssue}
          />
        )}

        {/* Board */}
        {tab === "board" && (
          <div className="surface-card p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1.5" />
                <rect x="14" y="3" width="7" height="11" rx="1.5" />
              </svg>
            </div>
            {activeSprint ? (
              <>
                <p className="font-medium mb-1">Active sprint sẵn sàng</p>
                <p className="text-sm text-muted mb-4">{activeSprint.name}</p>
                <Link href={`/board/${activeSprint.id}`}>
                  <Button variant="gradient">Mở Board</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium mb-1">Chưa có sprint nào đang chạy</p>
                <p className="text-sm text-muted">Tạo và start một sprint trong tab Sprints.</p>
              </>
            )}
          </div>
        )}

        {/* Sprints */}
        {tab === "sprints" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Sprints</h2>
              <Button size="sm" variant="gradient" onClick={() => setShowCreateSprint(true)}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tạo sprint
              </Button>
            </div>
            <div className="space-y-3">
              {sprints.map((sprint) => (
                <div key={sprint.id} className="surface-card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{sprint.name}</span>
                      <Badge type="sprint" value={sprint.status} />
                    </div>
                    {sprint.goal && <p className="text-sm text-muted truncate">{sprint.goal}</p>}
                    <p className="text-xs text-muted mt-1">
                      {sprint.issues?.length ?? 0} issues
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {sprint.status === "planned" && (
                      <Button
                        size="sm"
                        onClick={() => sprintAction.mutate({ projectId: id, sprintId: sprint.id, action: "start" })}
                      >
                        Start
                      </Button>
                    )}
                    {sprint.status === "active" && (
                      <>
                        <Link href={`/board/${sprint.id}`}>
                          <Button size="sm" variant="secondary">Mở Board</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => sprintAction.mutate({ projectId: id, sprintId: sprint.id, action: "complete" })}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {sprints.length === 0 && (
                <div className="surface-card p-10 text-center">
                  <p className="text-sm text-muted">Chưa có sprint nào — tạo sprint đầu tiên của bạn.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      <CreateIssueModal
        open={showCreateIssue}
        onClose={() => setShowCreateIssue(false)}
        projectId={Number(id)}
        sprints={sprints}
      />
      <CreateSprintModal
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        projectId={id}
      />
      {selectedIssue && (
        <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
    </div>
  );
}
