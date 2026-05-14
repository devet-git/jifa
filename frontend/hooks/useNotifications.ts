import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Notification, NotificationPrefs } from "@/types";

export function useNotifications(opts: { unreadOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (opts.unreadOnly) params.set("unread", "1");
  return useQuery<Notification[]>({
    queryKey: ["notifications", opts.unreadOnly ?? false],
    queryFn: () =>
      api.get(`/notifications?${params}`).then((r) => r.data),
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get("/notifications/unread-count").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.put(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useNotificationPrefs() {
  return useQuery<NotificationPrefs>({
    queryKey: ["notification-prefs"],
    queryFn: () =>
      api.get("/notifications/preferences").then((r) => r.data),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) =>
      api.put("/notifications/preferences", data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/read-all").then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
