import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Board } from "@/types";

export function useBoards(projectId: number | string) {
  return useQuery<Board[]>({
    queryKey: ["boards", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/boards`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useBoard(
  projectId: number | string,
  boardId: number | string | undefined,
) {
  return useQuery<Board>({
    queryKey: ["boards", String(projectId), String(boardId)],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/boards/${boardId}`)
        .then((r) => r.data),
    enabled: !!projectId && !!boardId,
  });
}

export function useCreateBoard(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; filter?: string }) =>
      api.post(`/projects/${projectId}/boards`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["boards", String(projectId)] }),
  });
}

export function useUpdateBoard(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name: string;
      filter?: string;
    }) =>
      api
        .put(`/projects/${projectId}/boards/${id}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["boards", String(projectId)] }),
  });
}

export function useDeleteBoard(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/projects/${projectId}/boards/${id}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["boards", String(projectId)] }),
  });
}
