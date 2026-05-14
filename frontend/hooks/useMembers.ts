import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Member, ProjectRole } from "@/types";

export function useMembers(projectId: number | string) {
  return useQuery<Member[]>({
    queryKey: ["members", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/members`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useAddMember(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: ProjectRole }) =>
      api.post(`/projects/${projectId}/members`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["members", String(projectId)] }),
  });
}

export function useUpdateMemberRole(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: ProjectRole }) =>
      api
        .put(`/projects/${projectId}/members/${memberId}`, { role })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["members", String(projectId)] }),
  });
}

export function useRemoveMember(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) =>
      api
        .delete(`/projects/${projectId}/members/${memberId}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["members", String(projectId)] }),
  });
}
