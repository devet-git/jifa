import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Label } from "@/types";

export function useLabels(projectId: number | string | undefined) {
  return useQuery<Label[]>({
    queryKey: ["labels", projectId],
    queryFn: () => api.get(`/projects/${projectId}/labels`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateLabel(projectId: number | string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post(`/projects/${projectId}/labels`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labels", projectId] }),
  });
}

export function useSetIssueLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, labelIds }: { issueId: number; labelIds: number[] }) =>
      api.put(`/issues/${issueId}/labels`, { label_ids: labelIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}
