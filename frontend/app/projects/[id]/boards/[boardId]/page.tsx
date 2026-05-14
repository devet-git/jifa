"use client";

import { use } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/useProject";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { id } = use(params);
  const { data: project } = useProject(id);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-7 pb-4 border-b border-border bg-surface">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {project?.name ?? "Project"}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
      </div>
      <div className="flex-1 p-8 overflow-auto text-muted-foreground">
        Select a board to view.
      </div>
    </div>
  );
}
