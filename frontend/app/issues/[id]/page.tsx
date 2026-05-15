"use client";

import { useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function IssueRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    api
      .get(`/issues/${id}`)
      .then((res) => {
        const projectId = res.data.project_id;
        if (projectId) {
          router.replace(`/projects/${projectId}?issue=${id}`);
        } else {
          router.replace("/projects");
        }
      })
      .catch(() => {
        router.replace("/projects");
      });
  }, [id, router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
        <p className="text-sm">Opening issue…</p>
      </div>
    </div>
  );
}
