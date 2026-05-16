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

export function useReorderVersions(projectId: number | string) {
  const qc = useQueryClient();
  const key = ["versions", String(projectId)] as const;
  return useMutation({
    mutationFn: (ids: number[]) =>
      api
        .put(`/projects/${projectId}/versions/reorder`, { ids })
        .then((r) => r.data),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Version[]>(key);
      if (prev) {
        const map = new Map(prev.map((v) => [v.id, v]));
        qc.setQueryData<Version[]>(
          key,
          ids.map((id) => map.get(id)).filter((v): v is Version => !!v),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
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
