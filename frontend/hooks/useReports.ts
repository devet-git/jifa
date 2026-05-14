import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface VelocityEntry {
  sprint_id: number;
  sprint_name: string;
  completed_at: string;
  committed_points: number;
  completed_points: number;
  committed_count: number;
  completed_count: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

export function useVelocity(projectId: number | string) {
  return useQuery<VelocityEntry[]>({
    queryKey: ["velocity", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reports/velocity`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export interface CycleEntry {
  issue_id: number;
  key: string;
  title: string;
  completed_at: string;
  cycle_hours: number;
}

export function useCycleTime(projectId: number | string) {
  return useQuery<CycleEntry[]>({
    queryKey: ["cycle-time", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reports/cycle-time`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export interface WorkloadEntry {
  user_id: number | null;
  user_name: string;
  open_count: number;
  in_progress_count: number;
  done_count: number;
  total_count: number;
  open_points: number;
  in_progress_points: number;
  done_points: number;
  total_points: number;
}

export function useWorkload(projectId: number | string) {
  return useQuery<WorkloadEntry[]>({
    queryKey: ["workload", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reports/workload`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useBurndown(
  projectId: number | string,
  sprintId: number | string | undefined,
) {
  return useQuery<BurndownPoint[]>({
    queryKey: ["burndown", projectId, sprintId],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/sprints/${sprintId}/burndown`)
        .then((r) => r.data),
    enabled: !!projectId && !!sprintId,
  });
}

export interface CFDPoint {
  date: string;
  counts: Record<string, number>;
}

export function useCFD(projectId: number | string) {
  return useQuery<CFDPoint[]>({
    queryKey: ["cfd", projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reports/cfd`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export interface TimeInStatusEntry {
  status_key: string;
  status_name: string;
  avg_hours: number;
  count: number;
}

export function useTimeInStatus(projectId: number | string) {
  return useQuery<TimeInStatusEntry[]>({
    queryKey: ["time-in-status", projectId],
    queryFn: () =>
      api
        .get(`/projects/${projectId}/reports/time-in-status`)
        .then((r) => r.data),
    enabled: !!projectId,
  });
}
