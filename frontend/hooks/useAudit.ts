import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AuditEntry } from "@/types";

export function useAudit(projectId: number | string) {
  return useQuery<AuditEntry[]>({
    queryKey: ["audit", String(projectId)],
    queryFn: () =>
      api.get(`/projects/${projectId}/audit`).then((r) => r.data),
    enabled: !!projectId,
  });
}
