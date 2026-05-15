"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { useIssues } from "@/hooks/useIssues";
import { useSprints } from "@/hooks/useSprints";
import { BacklogView } from "@/components/backlog/BacklogView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { IssueDetail } from "@/components/issues/IssueDetail";
import api from "@/lib/api";
import type { Issue } from "@/types";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);

  const { data: backlog = [] } = useIssues({ project_id: id, sprint_id: null });
  const { data: sprints = [] } = useSprints(id);

  // Open issue from ?issue= search param (shared link)
  const urlIssueHandled = useRef(false);
  useEffect(() => {
    const issueId = searchParams.get("issue");
    if (!issueId || urlIssueHandled.current) return;
    urlIssueHandled.current = true;
    api.get(`/issues/${issueId}`).then((res) => {
      if (res.data.project_id === Number(id)) {
        setSelectedIssue(res.data);
      }
    }).catch(() => {});
  }, [searchParams, id]);

  function handleCloseIssue() {
    setSelectedIssue(null);
    urlIssueHandled.current = false;
    router.replace(`/projects/${id}`, { scroll: false });
  }

  return (
    <div className="h-full p-8 overflow-auto">
      <BacklogView
        projectId={id}
        sprints={sprints}
        backlog={backlog}
        onCreateIssue={() => setShowCreateIssue(true)}
        onCreateSprint={() => {}} /* handled by /sprints tab */
        onIssueClick={setSelectedIssue}
      />
      <CreateIssueModal
        open={showCreateIssue}
        onClose={() => setShowCreateIssue(false)}
        projectId={Number(id)}
        sprints={sprints}
      />
      {selectedIssue && (
        <IssueDetail issue={selectedIssue} onClose={handleCloseIssue} />
      )}
    </div>
  );
}
