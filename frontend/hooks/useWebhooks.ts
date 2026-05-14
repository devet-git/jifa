import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Webhook, WebhookEvent } from "@/types";

export function useWebhooks(projectId: number | string) {
  return useQuery<Webhook[]>({
    queryKey: ["webhooks", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/webhooks`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateWebhook(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; events: WebhookEvent[]; active?: boolean }) =>
      api.post(`/projects/${projectId}/webhooks`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhooks", String(projectId)] }),
  });
}

export function useUpdateWebhook(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      url: string;
      events: WebhookEvent[];
      active?: boolean;
    }) =>
      api
        .put(`/projects/${projectId}/webhooks/${id}`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhooks", String(projectId)] }),
  });
}

export function useDeleteWebhook(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/projects/${projectId}/webhooks/${id}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhooks", String(projectId)] }),
  });
}
