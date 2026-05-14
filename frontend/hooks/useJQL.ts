import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Issue } from "@/types";

export function useJQL(query: string, opts: { enabled?: boolean } = {}) {
  return useQuery<Issue[]>({
    queryKey: ["jql", query],
    queryFn: () =>
      api.get(`/jql?q=${encodeURIComponent(query)}`).then((r) => r.data),
    enabled: !!query.trim() && (opts.enabled ?? true),
    retry: false,
  });
}

export function useRecentlyViewed() {
  return useQuery<Issue[]>({
    queryKey: ["recent-issues"],
    queryFn: () => api.get("/me/recent").then((r) => r.data),
  });
}
