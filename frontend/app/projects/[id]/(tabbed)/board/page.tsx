"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSprints } from "@/hooks/useSprints";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: sprints = [] } = useSprints(id);
  const activeSprint = sprints.find((s) => s.status === "active");

  useEffect(() => {
    if (activeSprint) {
      router.replace(`/board/${activeSprint.id}`);
    }
  }, [activeSprint, router]);

  if (activeSprint) return null;

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="surface-card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1.5" />
            <rect x="14" y="3" width="7" height="11" rx="1.5" />
          </svg>
        </div>
        <p className="font-medium mb-1">No sprint is currently active</p>
        <p className="text-sm text-muted">Create and start a sprint in the Sprints tab.</p>
      </div>
    </div>
  );
}
