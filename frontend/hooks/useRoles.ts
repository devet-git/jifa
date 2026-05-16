import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Role } from "@/types";

export function useRoles(projectId: number | string) {
  return useQuery<Role[]>({
    queryKey: ["roles", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/roles`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateRole(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post(`/projects/${projectId}/roles`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["roles", String(projectId)] }),
  });
}

export function useUpdateRole(projectId: number | string, roleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string }) =>
      api
        .put(`/projects/${projectId}/roles/${roleId}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["roles", String(projectId)] }),
  });
}

export function useDeleteRole(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: number) =>
      api.delete(`/projects/${projectId}/roles/${roleId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["roles", String(projectId)] }),
  });
}

export function useRolePermissions(
  projectId: number | string,
  roleId: number | null,
) {
  return useQuery<string[]>({
    queryKey: ["role-permissions", String(projectId), roleId],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/roles/${roleId}/permissions`)
        .then((r) => r.data ?? []),
    enabled: !!projectId && !!roleId,
  });
}

export function useSetRolePermissions(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      permissions,
    }: {
      roleId: number;
      permissions: string[];
    }) =>
      api
        .put(`/projects/${projectId}/roles/${roleId}/permissions`, {
          permissions,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles", String(projectId)] });
      qc.invalidateQueries({
        queryKey: ["role-permissions", String(projectId)],
        refetchType: "all",
      });
      // Permission changes can affect the current user's effective perms if
      // they belong to the role being edited. Invalidate so usePermissionsStore
      // is refreshed on next load.
      qc.invalidateQueries({
        queryKey: ["my-permissions", String(projectId)],
      });
    },
  });
}
