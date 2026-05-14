import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Component } from "@/types";

export function useComponents(projectId: number | string) {
  return useQuery<Component[]>({
    queryKey: ["components", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/components`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateComponent(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Component>) =>
      api.post(`/projects/${projectId}/components`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["components", String(projectId)] }),
  });
}

export function useUpdateComponent(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Component> & { id: number }) =>
      api
        .put(`/projects/${projectId}/components/${id}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["components", String(projectId)] }),
  });
}

export function useDeleteComponent(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/projects/${projectId}/components/${id}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["components", String(projectId)] }),
  });
}

export function useSetIssueComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      issueId,
      componentIds,
    }: {
      issueId: number;
      componentIds: number[];
    }) =>
      api
        .put(`/issues/${issueId}/components`, { component_ids: componentIds })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["issues", vars.issueId] });
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
