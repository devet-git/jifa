import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Webhook,
  WebhookEvent,
  WebhookAuthType,
  WebhookBodyType,
  WebhookMethod,
  WebhookTestResult,
} from "@/types";

export interface WebhookInput {
  name: string;
  url: string;
  events: WebhookEvent[];
  active?: boolean;
  method: WebhookMethod;
  content_type: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  auth_type: WebhookAuthType;
  auth_credentials: string;
  body_type: WebhookBodyType;
  body_template: string;
  form_fields: Record<string, string>;
}

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
    mutationFn: (data: WebhookInput) =>
      api.post(`/projects/${projectId}/webhooks`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhooks", String(projectId)] }),
  });
}

export function useUpdateWebhook(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: WebhookInput & { id: number }) =>
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
      api.delete(`/projects/${projectId}/webhooks/${id}`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhooks", String(projectId)] }),
  });
}

export function useTestWebhook(projectId: number | string) {
  return useMutation<WebhookTestResult, unknown, number>({
    mutationFn: (id) =>
      api
        .post(`/projects/${projectId}/webhooks/${id}/test`)
        .then((r) => r.data),
  });
}

/**
 * Dry-run a webhook configuration without persisting it. Used by the editor's
 * "Send test" button so users can verify their setup before saving.
 */
export function useTestWebhookDraft(projectId: number | string) {
  return useMutation<WebhookTestResult, unknown, WebhookInput>({
    mutationFn: (draft) =>
      api
        .post(`/projects/${projectId}/webhooks/test`, draft)
        .then((r) => r.data),
  });
}
