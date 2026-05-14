import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IssueLink, IssueLinkType } from "@/types";

export function useIssueLinks(issueId: number | string) {
  return useQuery<IssueLink[]>({
    queryKey: ["links", issueId],
    queryFn: () => api.get(`/issues/${issueId}/links`).then((r) => r.data),
    enabled: !!issueId,
  });
}

export function useCreateLink(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: IssueLinkType; target_id: number }) =>
      api.post(`/issues/${issueId}/links`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links", issueId] }),
  });
}

export function useDeleteLink(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) =>
      api.delete(`/issues/${issueId}/links/${linkId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links", issueId] }),
  });
}
