"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useAppearanceStore } from "@/store/appearance";

export function useLogout() {
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const resetAppearance = useAppearanceStore((s) => s.reset);

  return () => {
    logout();
    resetAppearance();
    qc.clear();
  };
}
