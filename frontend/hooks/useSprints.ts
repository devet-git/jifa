import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Sprint } from "@/types";

export function useSprints(projectId: number | string) {
  return useQuery<Sprint[]>({
    queryKey: ["sprints", projectId],
    queryFn: () => api.get(`/projects/${projectId}/sprints`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number | string; data: Partial<Sprint> }) =>
      api.post(`/projects/${projectId}/sprints`, data).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["sprints", vars.projectId] }),
  });
}

export function useSprintAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, sprintId, action }: { projectId: number | string; sprintId: number; action: "start" | "complete" }) =>
      api.post(`/projects/${projectId}/sprints/${sprintId}/${action}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }),
  });
}

export interface SprintRetro {
  sprint: Sprint;
  committed_points: number;
  delivered_points: number;
  committed_issues: number;
  delivered_issues: number;
  completed: import("@/types").Issue[];
  not_completed: import("@/types").Issue[];
  scope_added: import("@/types").Issue[];
}

export function useSprintRetro(sprintId: number | null | undefined) {
  return useQuery<SprintRetro>({
    queryKey: ["sprint-retro", sprintId],
    queryFn: () =>
      api.get(`/sprints/${sprintId}/retrospective`).then((r) => r.data),
    enabled: !!sprintId,
  });
}
