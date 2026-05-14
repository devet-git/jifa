import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SavedFilter } from "@/types";

export function useFilters(projectId?: number | string) {
  return useQuery<SavedFilter[]>({
    queryKey: ["filters", String(projectId ?? "")],
    queryFn: () =>
      api
        .get(`/filters${projectId ? `?project_id=${projectId}` : ""}`)
        .then((r) => r.data),
  });
}

export function useCreateFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SavedFilter>) =>
      api.post("/filters", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filters"] }),
  });
}

export function useDeleteFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/filters/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filters"] }),
  });
}
