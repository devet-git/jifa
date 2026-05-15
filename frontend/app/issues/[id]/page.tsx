"use client";

import { useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

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
        <Spinner className="w-6 h-6" />
        <p className="text-sm">Opening issue…</p>
      </div>
    </div>
  );
}
