import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { StatusCategory, StatusDefinition } from "@/types";

export function useStatuses(projectId: number | string) {
  return useQuery<StatusDefinition[]>({
    queryKey: ["statuses", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/statuses`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateStatus(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      key: string;
      name: string;
      category: StatusCategory;
      color?: string;
    }) =>
      api.post(`/projects/${projectId}/statuses`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["statuses", String(projectId)] }),
  });
}

export function useUpdateStatus(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      key: string;
      name: string;
      category: StatusCategory;
      color?: string;
    }) =>
      api
        .put(`/projects/${projectId}/statuses/${id}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["statuses", String(projectId)] }),
  });
}

export function useReorderStatuses(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status_ids: number[]) =>
      api
        .post(`/projects/${projectId}/statuses/reorder`, { status_ids })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["statuses", String(projectId)] }),
  });
}

export function useDeleteStatus(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/projects/${projectId}/statuses/${id}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["statuses", String(projectId)] }),
  });
}
