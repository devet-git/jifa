import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project } from "@/types";

export function useProjects(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  return useQuery<Project[]>({
    queryKey: ["projects", { includeArchived }],
    queryFn: () =>
      api
        .get("/projects", {
          params: includeArchived ? { include_archived: "true" } : undefined,
        })
        .then((r) => r.data),
  });
}

export function useProject(id: number | string) {
  return useQuery<Project>({
    queryKey: ["projects", id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.post("/projects", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number | string } & Omit<Partial<Project>, "id">) =>
      api.put(`/projects/${id}`, data).then((r) => r.data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["projects", vars.id] }),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) =>
      api.post(`/projects/${id}/archive`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useUnarchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) =>
      api.post(`/projects/${id}/unarchive`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirm }: { id: number | string; confirm: string }) =>
      api
        .delete(`/projects/${id}`, { data: { confirm } })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useToggleProjectStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, starred }: { id: number; starred: boolean }) =>
      (starred
        ? api.delete(`/projects/${id}/star`)
        : api.post(`/projects/${id}/star`)
      ).then((r) => r.data),
    // Optimistic flip so the star toggles instantly.
    onMutate: async ({ id, starred }) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData<Project[]>(["projects"]);
      if (prev) {
        qc.setQueryData<Project[]>(
          ["projects"],
          prev.map((p) => (p.id === id ? { ...p, is_starred: !starred } : p)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["projects"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    meta: { suppressErrorToast: true },
  });
}
