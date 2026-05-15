import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiToken } from "@/types";

export function useTokens() {
  return useQuery<ApiToken[]>({
    queryKey: ["tokens"],
    queryFn: () => api.get("/tokens").then((r) => r.data),
  });
}

export function useCreateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; expires_at?: string }) =>
      api.post("/tokens", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useDeleteToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tokens/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}
