import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Version } from "@/types";

export function useVersions(projectId: number | string) {
  return useQuery<Version[]>({
    queryKey: ["versions", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/versions`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateVersion(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Version>) =>
      api.post(`/projects/${projectId}/versions`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["versions", String(projectId)] }),
  });
}

export function useUpdateVersion(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Version> & { id: number }) =>
      api
        .put(`/projects/${projectId}/versions/${id}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["versions", String(projectId)] }),
  });
}

export function useVersionAction(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "release" | "unrelease";
    }) =>
      api
        .post(`/projects/${projectId}/versions/${id}/${action}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["versions", String(projectId)] }),
  });
}

export function useDeleteVersion(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/projects/${projectId}/versions/${id}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["versions", String(projectId)] }),
  });
}
