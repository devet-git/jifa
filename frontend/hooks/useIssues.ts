import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { computeMidRank } from "@/lib/dnd";
import type { Issue, IssueStatus, Sprint } from "@/types";

interface IssueFilters {
  project_id?: number | string;
  // undefined = no filter; null = only backlog (no sprint); string/number = specific sprint
  sprint_id?: number | string | null;
  status?: IssueStatus;
  type?: string;
  priority?: string;
  assignee_id?: number | string;
  due_date_from?: string;
  due_date_to?: string;
}

export function useIssues(filters: IssueFilters) {
  const params = new URLSearchParams();
  if (filters.project_id) params.set("project_id", String(filters.project_id));
  if (filters.sprint_id === null) {
    params.set("sprint_id", "none");
  } else if (filters.sprint_id !== undefined) {
    params.set("sprint_id", String(filters.sprint_id));
  }
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignee_id) params.set("assignee_id", String(filters.assignee_id));
  if (filters.due_date_from) params.set("due_date_from", filters.due_date_from);
  if (filters.due_date_to) params.set("due_date_to", filters.due_date_to);

  return useQuery<Issue[]>({
    queryKey: ["issues", filters],
    queryFn: () => api.get(`/issues?${params}`).then((r) => r.data),
    enabled: !!filters.project_id || !!filters.sprint_id || !!filters.due_date_from,
  });
}

export function useIssue(id: number | string) {
  return useQuery<Issue>({
    queryKey: ["issues", id],
    queryFn: () => api.get(`/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Issue>) => api.post("/issues", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

type IssueCacheEntry = [readonly unknown[], Issue[] | undefined];
type SprintCacheEntry = [readonly unknown[], Sprint[] | undefined];

export function useUpdateIssueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: IssueStatus | string }) =>
      api.put(`/issues/${id}/status`, { status }).then((r) => r.data),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["issues"] });
      await qc.cancelQueries({ queryKey: ["sprints"] });
      const issueCaches = qc.getQueriesData<Issue[]>({ queryKey: ["issues"] }) as IssueCacheEntry[];
      const sprintCaches = qc.getQueriesData<Sprint[]>({ queryKey: ["sprints"] }) as SprintCacheEntry[];

      const patch = (i: Issue): Issue =>
        i.id === id ? { ...i, status: status as IssueStatus } : i;

      qc.setQueriesData<Issue[]>({ queryKey: ["issues"] }, (prev) =>
        Array.isArray(prev) ? prev.map(patch) : prev,
      );
      qc.setQueriesData<Sprint[]>({ queryKey: ["sprints"] }, (prev) =>
        Array.isArray(prev)
          ? prev.map((s) => ({ ...s, issues: s.issues?.map(patch) }))
          : prev,
      );

      return { issueCaches, sprintCaches };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.issueCaches.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.sprintCaches.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}

interface RankVars {
  id: number;
  before_id?: number;
  after_id?: number;
  sprint_id?: number;
  clear_sprint?: boolean;
}

export function useRankIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: RankVars) =>
      api.put(`/issues/${id}/rank`, body).then((r) => r.data),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["issues"] });
      await qc.cancelQueries({ queryKey: ["sprints"] });

      const issueCaches = qc.getQueriesData<Issue[]>({ queryKey: ["issues"] }) as IssueCacheEntry[];
      const sprintCaches = qc.getQueriesData<Sprint[]>({ queryKey: ["sprints"] }) as SprintCacheEntry[];

      // Find current issue + neighbor ranks across any loaded cache.
      const allIssues = collectAllIssues(issueCaches, sprintCaches);
      const moving = allIssues.get(vars.id);
      const before = vars.before_id ? allIssues.get(vars.before_id) : undefined;
      const after = vars.after_id ? allIssues.get(vars.after_id) : undefined;
      const newRank = computeMidRank(before?.rank, after?.rank);

      // Patch a single issue with new rank + (optionally) new sprint placement.
      const patch = (i: Issue): Issue => {
        if (i.id !== vars.id) return i;
        const next: Issue = { ...i, rank: newRank };
        if (vars.clear_sprint) {
          // Issue interface has sprint_id?: number; remove the key when clearing.
          delete (next as Partial<Issue>).sprint_id;
        } else if (vars.sprint_id !== undefined) {
          next.sprint_id = vars.sprint_id;
        }
        return next;
      };

      // Re-sort helper so the optimistic UI reflects the new order immediately,
      // not just on the next refetch.
      const sortByRank = (a: Issue, b: Issue) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;

      qc.setQueriesData<Issue[]>({ queryKey: ["issues"] }, (prev) => {
        if (!Array.isArray(prev)) return prev;
        const patched = prev.map(patch);
        return patched.slice().sort(sortByRank);
      });

      // Nested sprint.issues caches: handle remove-from-old / add-to-new across sprints,
      // and re-sort within the destination sprint.
      qc.setQueriesData<Sprint[]>({ queryKey: ["sprints"] }, (prev) => {
        if (!Array.isArray(prev)) return prev;
        const movingPrev = moving;
        return prev.map((s) => {
          const list = s.issues ?? [];
          const hasIssue = list.some((i) => i.id === vars.id);
          const isDestSprint = vars.sprint_id !== undefined && s.id === vars.sprint_id;
          const isCrossSprint =
            vars.sprint_id !== undefined && movingPrev?.sprint_id !== vars.sprint_id;

          // Removed from a sprint (clear_sprint, or moved to a different sprint).
          if (hasIssue && (vars.clear_sprint || isCrossSprint)) {
            return { ...s, issues: list.filter((i) => i.id !== vars.id) };
          }

          // Reordered or moved into this sprint.
          if (hasIssue) {
            return { ...s, issues: list.map(patch).slice().sort(sortByRank) };
          }
          if (isDestSprint && movingPrev) {
            const inserted = [...list, patch(movingPrev)];
            return { ...s, issues: inserted.sort(sortByRank) };
          }
          return s;
        });
      });

      return { issueCaches, sprintCaches };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.issueCaches.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.sprintCaches.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}

// Aggregate every issue we can see across loaded caches, so optimistic updates
// can resolve before_id / after_id / the moving issue regardless of which page
// originated the drag.
function collectAllIssues(
  issueCaches: IssueCacheEntry[],
  sprintCaches: SprintCacheEntry[],
): Map<number, Issue> {
  const map = new Map<number, Issue>();
  for (const [, list] of issueCaches) {
    if (!Array.isArray(list)) continue;
    for (const i of list) if (!map.has(i.id)) map.set(i.id, i);
  }
  for (const [, sprints] of sprintCaches) {
    if (!Array.isArray(sprints)) continue;
    for (const s of sprints)
      for (const i of s.issues ?? []) if (!map.has(i.id)) map.set(i.id, i);
  }
  return map;
}

export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Issue> & { id: number }) =>
      api.put(`/issues/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useCloneIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post(`/issues/${id}/clone`).then((r) => r.data as Issue),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      issueId,
      body,
      mentionUserIds,
    }: {
      issueId: number;
      body: string;
      mentionUserIds?: number[];
    }) =>
      api
        .post(`/issues/${issueId}/comments`, {
          body,
          mention_user_ids: mentionUserIds,
        })
        .then((r) => r.data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["issues", vars.issueId] }),
  });
}
