"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppearancePreferences } from "@/types";

export interface AppearanceState {
  fontSize: AppearancePreferences["font_size"];
  fontFamily: AppearancePreferences["font_family"];
  accentColor: AppearancePreferences["accent_color"];
  setFontSize: (v: AppearancePreferences["font_size"]) => void;
  setFontFamily: (v: AppearancePreferences["font_family"]) => void;
  setAccentColor: (v: AppearancePreferences["accent_color"]) => void;
  syncFromBackend: (prefs: AppearancePreferences) => void;
  reset: () => void;
}

const DEFAULTS: Pick<AppearanceState, "fontSize" | "fontFamily" | "accentColor"> = {
  fontSize: "medium",
  fontFamily: "geist",
  accentColor: "indigo",
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAccentColor: (accentColor) => set({ accentColor }),
      syncFromBackend: (prefs) =>
        set({
          fontSize: prefs.font_size ?? DEFAULTS.fontSize,
          fontFamily: prefs.font_family ?? DEFAULTS.fontFamily,
          accentColor: prefs.accent_color ?? DEFAULTS.accentColor,
        }),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: "jifa-appearance" },
  ),
);
