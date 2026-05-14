import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Worklog } from "@/types";

export function useWorklog(issueId: number | string) {
  return useQuery<Worklog[]>({
    queryKey: ["worklog", issueId],
    queryFn: () => api.get(`/issues/${issueId}/worklog`).then((r) => r.data),
    enabled: !!issueId,
  });
}

export function useAddWorklog(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { minutes: number; description?: string; started_at?: string }) =>
      api.post(`/issues/${issueId}/worklog`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worklog", issueId] });
      qc.invalidateQueries({ queryKey: ["issues", issueId] });
    },
  });
}

export function useDeleteWorklog(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (worklogId: number) =>
      api
        .delete(`/issues/${issueId}/worklog/${worklogId}`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worklog", issueId] });
      qc.invalidateQueries({ queryKey: ["issues", issueId] });
    },
  });
}

// parseDuration converts "1h 30m" / "2h" / "45m" / "1d" into minutes.
// d = 8h working day (Jira convention). Returns null on bad input.
export function parseDuration(input: string): number | null {
  const re = /(\d+)\s*([dhm])/gi;
  let total = 0;
  let m: RegExpExecArray | null;
  let any = false;
  while ((m = re.exec(input))) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === "d") total += n * 8 * 60;
    else if (unit === "h") total += n * 60;
    else total += n;
    any = true;
  }
  if (!any) {
    const justNum = Number(input.trim());
    if (!Number.isFinite(justNum) || justNum <= 0) return null;
    return justNum; // bare number = minutes
  }
  return total > 0 ? total : null;
}

// formatDuration: 90 → "1h 30m". Compact for UI.
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "0m";
  const days = Math.floor(minutes / (8 * 60));
  const hours = Math.floor((minutes % (8 * 60)) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(" ") || "0m";
}
