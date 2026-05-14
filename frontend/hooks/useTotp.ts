import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useTotpSetup() {
  return useMutation({
    mutationFn: () =>
      api.get("/auth/totp/setup").then(
        (r) => r.data as { secret: string; otpauth_url: string },
      ),
  });
}

export function useTotpEnable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api.post("/auth/totp/enable", { code }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useTotpDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      api.post("/auth/totp/disable", { password }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}
