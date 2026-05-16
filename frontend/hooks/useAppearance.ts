"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AppearancePreferences } from "@/types";
import { useAppearanceStore } from "@/store/appearance";

export function useAppearance() {
  const syncFromBackend = useAppearanceStore((s) => s.syncFromBackend);
  const query = useQuery<AppearancePreferences>({
    queryKey: ["appearance"],
    queryFn: () => api.get("/me/preferences").then((r) => r.data),
    staleTime: 5 * 60_000,
    meta: { suppressErrorToast: true },
  });

  useEffect(() => {
    if (query.data) syncFromBackend(query.data);
  }, [query.data, syncFromBackend]);

  return query;
}

export function useUpdateAppearance() {
  const qc = useQueryClient();
  const setFontSize = useAppearanceStore((s) => s.setFontSize);
  const setFontFamily = useAppearanceStore((s) => s.setFontFamily);
  const setAccentColor = useAppearanceStore((s) => s.setAccentColor);

  return useMutation({
    mutationFn: (data: Partial<AppearancePreferences>) =>
      api.put("/me/preferences", data).then((r) => r.data),
    onSuccess: (data: AppearancePreferences) => {
      setFontSize(data.font_size);
      setFontFamily(data.font_family);
      setAccentColor(data.accent_color);
      qc.setQueryData(["appearance"], data);
    },
  });
}
