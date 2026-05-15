import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { User } from "@/types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });
}

export function useMe() {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/me").then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; avatar?: string }) =>
      api.put("/me", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.put("/me/password", data).then((r) => r.data),
  });
}
