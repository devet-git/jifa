import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { WikiComment } from "@/types";

export function useWikiComments(projectId: string | number, pageId: number | null) {
  return useQuery<WikiComment[]>({
    queryKey: ["wiki", String(projectId), pageId, "comments"],
    queryFn: () =>
      api.get(`/projects/${projectId}/wiki/${pageId}/comments`).then((r) => r.data),
    enabled: !!pageId,
  });
}

export function useCreateWikiComment(projectId: string | number, pageId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string; mention_user_ids?: number[] }) =>
      api.post(`/projects/${projectId}/wiki/${pageId}/comments`, body).then((r) => r.data as WikiComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki", String(projectId), pageId, "comments"] });
    },
  });
}

export function useUpdateWikiComment(projectId: string | number, pageId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) =>
      api.put(`/projects/${projectId}/wiki/${pageId}/comments/${id}`, { body }).then((r) => r.data as WikiComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki", String(projectId), pageId, "comments"] });
    },
  });
}

export function useDeleteWikiComment(projectId: string | number, pageId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/projects/${projectId}/wiki/${pageId}/comments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki", String(projectId), pageId, "comments"] });
    },
  });
}
