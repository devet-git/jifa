import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Issue, IssueStatus } from "@/types";

interface IssueFilters {
  project_id?: number | string;
  // undefined = no filter; null = only backlog (no sprint); string/number = specific sprint
  sprint_id?: number | string | null;
  status?: IssueStatus;
  type?: string;
  priority?: string;
  assignee_id?: number | string;
}

export function useIssues(filters: IssueFilters) {
  const params = new URLSearchParams();
  if (filters.project_id) params.set("project_id", String(filters.project_id));
  if (filters.sprint_id === null) {
    params.set("sprint_id", "none");
  } else if (filters.sprint_id !== undefined) {
    params.set("sprint_id", String(filters.sprint_id));
  }
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignee_id) params.set("assignee_id", String(filters.assignee_id));

  return useQuery<Issue[]>({
    queryKey: ["issues", filters],
    queryFn: () => api.get(`/issues?${params}`).then((r) => r.data),
    enabled: !!filters.project_id || !!filters.sprint_id,
  });
}

export function useIssue(id: number | string) {
  return useQuery<Issue>({
    queryKey: ["issues", id],
    queryFn: () => api.get(`/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Issue>) => api.post("/issues", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useUpdateIssueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: IssueStatus | string }) =>
      api.put(`/issues/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useRankIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      before_id?: number;
      after_id?: number;
      sprint_id?: number;
      clear_sprint?: boolean;
    }) => api.put(`/issues/${id}/rank`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}

export function useCloneIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post(`/issues/${id}/clone`).then((r) => r.data as Issue),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      issueId,
      body,
      mentionUserIds,
    }: {
      issueId: number;
      body: string;
      mentionUserIds?: number[];
    }) =>
      api
        .post(`/issues/${issueId}/comments`, {
          body,
          mention_user_ids: mentionUserIds,
        })
        .then((r) => r.data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["issues", vars.issueId] }),
  });
}
