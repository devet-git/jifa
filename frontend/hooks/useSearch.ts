import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SearchResults } from "@/types";

export function useSearch(q: string) {
  return useQuery<SearchResults>({
    queryKey: ["search", q],
    queryFn: () =>
      api.get(`/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    enabled: q.trim().length > 0,
    staleTime: 5_000,
  });
}
