import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  GitLabIntegration,
  GitLabIntegrationInput,
  GitLabTestResult,
  IssueExternalRef,
  ExternalRefInput,
  CreateBranchInput,
} from "@/types";

type IntegrationResponse =
  | (GitLabIntegration & { configured?: true })
  | { configured: false };

export function useGitLabIntegration(projectId: number | string | undefined) {
  return useQuery<IntegrationResponse>({
    queryKey: ["gitlab-integration", String(projectId ?? "")],
    queryFn: () =>
      api.get(`/projects/${projectId}/integrations/gitlab`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useUpsertGitLabIntegration(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation<GitLabIntegration, unknown, GitLabIntegrationInput>({
    mutationFn: (data) =>
      api
        .put(`/projects/${projectId}/integrations/gitlab`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["gitlab-integration", String(projectId)],
      }),
  });
}

export function useDisconnectGitLabIntegration(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete(`/projects/${projectId}/integrations/gitlab`),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["gitlab-integration", String(projectId)],
      }),
  });
}

export function useTestGitLabIntegration(projectId: number | string) {
  return useMutation<GitLabTestResult, unknown, void>({
    mutationFn: () =>
      api
        .post(`/projects/${projectId}/integrations/gitlab/test`)
        .then((r) => r.data),
  });
}

export function useRevealGitLabSecret(projectId: number | string) {
  return useMutation<{ webhook_secret: string }, unknown, void>({
    mutationFn: () =>
      api
        .get(`/projects/${projectId}/integrations/gitlab/secret`)
        .then((r) => r.data),
  });
}

export function useSetGitLabEnabled(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation<GitLabIntegration, unknown, boolean>({
    mutationFn: (enabled) =>
      api
        .post(`/projects/${projectId}/integrations/gitlab/enabled`, {
          enabled,
        })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["gitlab-integration", String(projectId)],
      }),
  });
}

export function useRotateGitLabSecret(projectId: number | string) {
  const qc = useQueryClient();
  return useMutation<{ webhook_secret: string }, unknown, void>({
    mutationFn: () =>
      api
        .post(`/projects/${projectId}/integrations/gitlab/rotate-secret`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["gitlab-integration", String(projectId)],
      }),
  });
}

export function useIssueExternalRefs(issueId: number | string | undefined) {
  return useQuery<IssueExternalRef[]>({
    queryKey: ["external-refs", String(issueId ?? "")],
    queryFn: () =>
      api.get(`/issues/${issueId}/external-refs`).then((r) => r.data),
    enabled: !!issueId,
  });
}

export function useCreateExternalRef(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation<IssueExternalRef, unknown, ExternalRefInput>({
    mutationFn: (data) =>
      api
        .post(`/issues/${issueId}/external-refs`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["external-refs", String(issueId)] }),
  });
}

export function useDeleteExternalRef(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId: number) =>
      api.delete(`/issues/${issueId}/external-refs/${refId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["external-refs", String(issueId)] }),
  });
}

export function useGitLabBranches(
  issueId: number | string | undefined,
  enabled: boolean,
) {
  return useQuery<{ name: string; web_url: string }[]>({
    queryKey: ["gitlab-branches", String(issueId ?? "")],
    queryFn: () =>
      api
        .get(`/issues/${issueId}/external-refs/branches`)
        .then((r) => r.data),
    enabled: !!issueId && enabled,
    staleTime: 30_000,
  });
}

export function useCreateGitLabBranch(issueId: number | string) {
  const qc = useQueryClient();
  return useMutation<IssueExternalRef, unknown, CreateBranchInput>({
    mutationFn: (data) =>
      api
        .post(`/issues/${issueId}/external-refs/create-branch`, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["external-refs", String(issueId)] }),
  });
}
