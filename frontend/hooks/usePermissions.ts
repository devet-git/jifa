import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Permission } from "@/types";

export function usePermissions(projectId: number | string) {
  return useQuery<Permission[]>({
    queryKey: ["permissions", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/permissions`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useMyPermissions(projectId: number | string) {
  return useQuery<string[]>({
    queryKey: ["my-permissions", String(projectId)],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/permissions/my`)
        .then((r) => r.data),
    enabled: !!projectId,
  });
}
