"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProjects, useToggleProjectStar } from "@/hooks/useProject";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/Button";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const toggleStar = useToggleProjectStar();
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.key.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle),
    );
  }, [projects, q]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted mt-1">
            <span className="font-medium text-foreground">{projects.length}</span>{" "}
            project{projects.length === 1 ? "" : "s"} bạn có quyền truy cập.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-border rounded-[10px] hover:border-[var(--border-strong)] focus-within:border-brand transition w-64">
            <svg
              className="ml-3 w-4 h-4 text-muted shrink-0"
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
              type="text"
              placeholder="Tìm project…"
              className="flex-1 min-w-0 bg-transparent text-sm px-2 py-2 outline-none placeholder:text-[var(--muted-2)]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button variant="gradient" onClick={() => setShowCreate(true)}>
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-soft flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          </div>
          {q ? (
            <>
              <p className="font-semibold text-base mb-1">Không tìm thấy</p>
              <p className="text-sm text-muted">
                Không có project nào khớp với &ldquo;
                <span className="text-foreground">{q}</span>&rdquo;.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-base mb-1">Chưa có project</p>
              <p className="text-sm text-muted mb-5">
                Tạo dự án đầu tiên để bắt đầu theo dõi issue & sprint.
              </p>
              <Button variant="gradient" onClick={() => setShowCreate(true)}>
                Create your first project
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group relative">
              <button
                type="button"
                aria-label={p.is_starred ? "Unstar project" : "Star project"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleStar.mutate({ id: p.id, starred: !!p.is_starred });
                }}
                className={
                  "absolute top-3 right-3 z-10 p-1.5 rounded-md transition " +
                  (p.is_starred
                    ? "text-amber-400 hover:text-amber-500"
                    : "text-[var(--muted-2)] opacity-0 group-hover:opacity-100 hover:text-amber-400")
                }
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill={p.is_starred ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <div className="surface-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col">
                <div className="flex items-start gap-3 mb-3 pr-8">
                  <span className="gradient-brand text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wide shrink-0 shadow-sm">
                    {p.key}
                  </span>
                  <h3 className="font-semibold truncate flex-1 group-hover:text-brand transition">
                    {p.name}
                  </h3>
                </div>
                {p.description ? (
                  <p className="text-sm text-muted line-clamp-3 leading-relaxed flex-1">
                    {p.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted italic flex-1">
                    No description
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Open project
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
