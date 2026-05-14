"use client";

import { useRef, useState } from "react";
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from "@/hooks/useNotifications";
import { useMe, useUpdateProfile } from "@/hooks/useUsers";
import { Avatar } from "@/components/ui/Avatar";
import type { NotificationPrefs } from "@/types";

type Row = {
  label: string;
  description: string;
  inApp: keyof NotificationPrefs;
  email: keyof NotificationPrefs;
};

const ROWS: Row[] = [
  {
    label: "Comments",
    description: "Có người comment vào issue bạn đang theo dõi.",
    inApp: "in_app_comment",
    email: "email_comment",
  },
  {
    label: "Mentions",
    description: "Có người @-mention bạn trong comment.",
    inApp: "in_app_mention",
    email: "email_mention",
  },
  {
    label: "Assigned to you",
    description: "Một issue được giao cho bạn.",
    inApp: "in_app_assigned",
    email: "email_assigned",
  },
  {
    label: "Status changes",
    description: "Issue bạn watch chuyển trạng thái.",
    inApp: "in_app_status_change",
    email: "email_status_change",
  },
  {
    label: "Issue links",
    description: "Có người thêm liên kết blocks / relates / duplicates.",
    inApp: "in_app_link_added",
    email: "email_link_added",
  },
];

export default function PreferencesPage() {
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  function set(key: keyof NotificationPrefs, value: boolean) {
    update.mutate({ [key]: value } as Partial<NotificationPrefs>);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile.mutate({ avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  const displayName = name || me?.name || "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Preferences</h1>
        <p className="text-sm text-muted mt-1">
          Manage your profile and notification settings.
        </p>
      </div>

      {/* Account section */}
      <div className="surface-card p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Account</h2>
        <div className="flex items-center gap-5">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => fileRef.current?.click()}
            title="Click to change avatar"
          >
            <Avatar name={me?.name} src={me?.avatar} size="xl" />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <label className="text-xs text-muted block mb-1">Display name</label>
              <input
                className="input !py-1.5 !text-sm w-56"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  const n = displayName.trim();
                  if (n && n !== me?.name) updateProfile.mutate({ name: n });
                }}
              />
            </div>
            <p className="text-xs text-muted">{me?.email}</p>
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden mb-6">
        <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-border">
          <div>
            <p className="font-medium text-sm">Daily digest email</p>
            <p className="text-xs text-muted mt-0.5">
              Receive one summary email per day instead of individual notifications. When enabled, per-event emails are suppressed.
            </p>
          </div>
          <Toggle
            checked={Boolean(prefs?.email_digest)}
            onChange={(v) => set("email_digest", v)}
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-5 py-3 border-b border-border bg-surface-2/60 text-[11px] uppercase tracking-wider font-medium text-muted">
          <span>Event</span>
          <span className="text-center">In-app</span>
          <span className="text-center">Email</span>
        </div>
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_80px_80px] gap-4 px-5 py-4 border-b border-border items-center last:border-b-0 hover:bg-surface-2/30 transition"
          >
            <div>
              <p className="font-medium text-sm">{row.label}</p>
              <p className="text-xs text-muted mt-0.5">{row.description}</p>
            </div>
            <Toggle
              checked={Boolean(prefs?.[row.inApp])}
              onChange={(v) => set(row.inApp, v)}
            />
            <Toggle
              checked={Boolean(prefs?.[row.email])}
              onChange={(v) => set(row.email, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`mx-auto w-10 h-6 rounded-full relative transition-colors ${
        checked ? "gradient-brand" : "bg-surface-3"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
