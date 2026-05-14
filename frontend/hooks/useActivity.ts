import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IssueActivityEntry } from "@/types";

export function useActivity(issueId: number | string) {
  return useQuery<IssueActivityEntry[]>({
    queryKey: ["activity", issueId],
    queryFn: () => api.get(`/issues/${issueId}/activity`).then((r) => r.data),
    enabled: !!issueId,
  });
}
