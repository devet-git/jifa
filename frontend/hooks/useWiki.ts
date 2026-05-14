import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { WikiPage } from "@/types";

const key = (projectId: string | number) => ["wiki", String(projectId)];

export function useWikiPages(projectId: string | number) {
  return useQuery<WikiPage[]>({
    queryKey: key(projectId),
    queryFn: () =>
      api.get(`/projects/${projectId}/wiki`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useWikiPage(projectId: string | number, pageId: number | null) {
  return useQuery<WikiPage>({
    queryKey: ["wiki", String(projectId), pageId],
    queryFn: () =>
      api.get(`/projects/${projectId}/wiki/${pageId}`).then((r) => r.data),
    enabled: !!pageId,
  });
}

export function useCreateWikiPage(projectId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; content: string }) =>
      api.post(`/projects/${projectId}/wiki`, body).then((r) => r.data as WikiPage),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}

export function useUpdateWikiPage(projectId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; content?: string }) =>
      api.put(`/projects/${projectId}/wiki/${id}`, body).then((r) => r.data as WikiPage),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}

export function useDeleteWikiPage(projectId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/projects/${projectId}/wiki/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}
