import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Attachment } from "@/types";

export function useAttachments(issueId: number | string) {
  return useQuery<Attachment[]>({
    queryKey: ["attachments", issueId],
    queryFn: () =>
      api.get(`/issues/${issueId}/attachments`).then((r) => r.data),
    enabled: !!issueId,
  });
}

export function useUploadAttachment(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post(`/issues/${issueId}/attachments`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", issueId] }),
  });
}

export function useDeleteAttachment(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      api
        .delete(`/issues/${issueId}/attachments/${attachmentId}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", issueId] }),
  });
}

// downloadURL returns the URL to fetch an attachment directly. Auth is sent
// via the same Bearer header pattern, so the link only works for the current
// session. We use api's defaults so baseURL stays consistent.
export function attachmentDownloadUrl(
  issueId: number | string,
  attachmentId: number,
) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  return `${base}/issues/${issueId}/attachments/${attachmentId}`;
}
