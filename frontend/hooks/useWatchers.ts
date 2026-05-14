import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IssueWatcher } from "@/types";

export function useWatchers(issueId: number | string) {
  return useQuery<IssueWatcher[]>({
    queryKey: ["watchers", issueId],
    queryFn: () => api.get(`/issues/${issueId}/watchers`).then((r) => r.data),
    enabled: !!issueId,
  });
}

export function useToggleWatch(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (watching: boolean) =>
      watching
        ? api.delete(`/issues/${issueId}/watch`)
        : api.post(`/issues/${issueId}/watch`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchers", issueId] }),
  });
}
