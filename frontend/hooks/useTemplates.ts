import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { IssueTemplate } from "@/types";

export function useTemplates(projectId: number | string) {
  return useQuery<IssueTemplate[]>({
    queryKey: ["templates", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/templates`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<IssueTemplate, "id" | "created_at">) =>
      api
        .post(`/projects/${data.project_id}/templates`, data)
        .then((r) => r.data),
    onSuccess: (_: unknown, vars: Omit<IssueTemplate, "id" | "created_at">) =>
      qc.invalidateQueries({ queryKey: ["templates", vars.project_id] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      api.delete(`/projects/${projectId}/templates/${id}`),
    onSuccess: (
      _: unknown,
      vars: { projectId: number; id: number },
    ) => qc.invalidateQueries({ queryKey: ["templates", vars.projectId] }),
  });
}
