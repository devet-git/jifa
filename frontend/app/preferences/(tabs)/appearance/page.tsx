"use client";

import { useAppearance, useUpdateAppearance } from "@/hooks/useAppearance";
import { useAppearanceStore } from "@/store/appearance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Check, Palette, Type } from "lucide-react";
import type { AppearancePreferences } from "@/types";

const FONT_SIZES = [
  { value: "small", label: "Small", px: "14px" },
  { value: "medium", label: "Medium", px: "16px" },
  { value: "large", label: "Large", px: "18px" },
  { value: "xl", label: "XL", px: "20px" },
] as const;

const FONT_FAMILIES = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "manrope", label: "Manrope" },
] as const;

const ACCENT_COLORS: { value: AppearancePreferences["accent_color"]; fill: string }[] = [
  { value: "indigo", fill: "bg-indigo-500" },
  { value: "blue", fill: "bg-blue-500" },
  { value: "green", fill: "bg-green-500" },
  { value: "orange", fill: "bg-orange-500" },
  { value: "purple", fill: "bg-purple-500" },
  { value: "red", fill: "bg-red-500" },
  { value: "pink", fill: "bg-pink-500" },
  { value: "teal", fill: "bg-teal-500" },
];

export default function AppearancePage() {
  useAppearance();
  const update = useUpdateAppearance();
  const fontSize = useAppearanceStore((s) => s.fontSize);
  const fontFamily = useAppearanceStore((s) => s.fontFamily);
  const accentColor = useAppearanceStore((s) => s.accentColor);

  function setPref<K extends keyof AppearancePreferences>(
    key: K,
    value: AppearancePreferences[K],
  ) {
    update.mutate({ [key]: value });
  }

  return (
    <div className="space-y-6">
      {/* Font Size */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Type className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Font Size</h2>
            <p className="text-xs text-muted">
              Adjust the base text size across the interface.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {FONT_SIZES.map((s) => {
            const active = fontSize === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setPref("font_size", s.value)}
                className={`relative flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium transition border ${
                  active
                    ? "bg-brand text-white border-brand shadow-sm"
                    : "bg-surface-2 text-muted border-border hover:border-brand hover:text-foreground"
                }`}
              >
                <span style={{ fontSize: s.px }}>Aa</span>
                <span className="text-xs">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Type className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Font Family</h2>
            <p className="text-xs text-muted">
              Choose the typeface used throughout the application.
            </p>
          </div>
        </div>
        <Select
          value={fontFamily}
          onValueChange={(v) => setPref("font_family", v as AppearancePreferences["font_family"])}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accent Color */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Accent Color</h2>
            <p className="text-xs text-muted">
              Customize the primary brand color used for buttons, links, and highlights.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {ACCENT_COLORS.map((c) => {
            const active = accentColor === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setPref("accent_color", c.value)}
                className={`w-10 h-10 rounded-full ${c.fill} ${
                  active
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                    : "ring-1 ring-offset-1 ring-offset-background ring-border hover:scale-110"
                } transition-all`}
                aria-label={c.value}
              >
                {active && (
                  <Check className="w-4 h-4 mx-auto text-white drop-shadow" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
