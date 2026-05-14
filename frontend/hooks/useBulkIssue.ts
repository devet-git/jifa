import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IssueStatus, IssuePriority, IssueType } from "@/types";

export interface BulkPatch {
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  assignee_id?: number;
  sprint_id?: number;
  clear_assignee?: boolean;
  clear_sprint?: boolean;
}

export function useBulkIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      issue_ids: number[];
      patch?: BulkPatch;
      delete?: boolean;
    }) => api.post("/issues/bulk", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}
