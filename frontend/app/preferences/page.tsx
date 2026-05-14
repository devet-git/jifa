"use client";

import { useRef, useState } from "react";
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from "@/hooks/useNotifications";
import { useMe, useUpdateProfile } from "@/hooks/useUsers";
import { useTotpSetup, useTotpEnable, useTotpDisable } from "@/hooks/useTotp";
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
    description: "Someone comments on an issue you are watching.",
    inApp: "in_app_comment",
    email: "email_comment",
  },
  {
    label: "Mentions",
    description: "Someone @-mentions you in a comment.",
    inApp: "in_app_mention",
    email: "email_mention",
  },
  {
    label: "Assigned to you",
    description: "An issue is assigned to you.",
    inApp: "in_app_assigned",
    email: "email_assigned",
  },
  {
    label: "Status changes",
    description: "An issue you are watching changes status.",
    inApp: "in_app_status_change",
    email: "email_status_change",
  },
  {
    label: "Issue links",
    description: "Someone adds a blocks / relates / duplicates link.",
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

  // TOTP state
  const totpSetup = useTotpSetup();
  const totpEnable = useTotpEnable();
  const totpDisable = useTotpDisable();
  const [totpStep, setTotpStep] = useState<"idle" | "setup" | "disabling">("idle");
  const [totpData, setTotpData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpError, setTotpError] = useState("");

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

  async function startTotpSetup() {
    setTotpError("");
    const data = await totpSetup.mutateAsync();
    setTotpData(data);
    setTotpStep("setup");
    setTotpCode("");
  }

  async function confirmTotpEnable(e: React.FormEvent) {
    e.preventDefault();
    setTotpError("");
    try {
      await totpEnable.mutateAsync(totpCode);
      setTotpStep("idle");
      setTotpData(null);
      setTotpCode("");
    } catch {
      setTotpError("Invalid code — please check your authenticator app.");
    }
  }

  async function confirmTotpDisable(e: React.FormEvent) {
    e.preventDefault();
    setTotpError("");
    try {
      await totpDisable.mutateAsync(totpPassword);
      setTotpStep("idle");
      setTotpPassword("");
    } catch {
      setTotpError("Incorrect password.");
    }
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

      {/* Two-Factor Authentication */}
      <div className="surface-card p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
            <p className="text-xs text-muted mt-0.5">
              {me?.totp_enabled
                ? "2FA is active. Your account requires an authenticator code on login."
                : "Add an extra layer of security with a TOTP authenticator app."}
            </p>
          </div>
          {me?.totp_enabled ? (
            <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-full">
              Enabled
            </span>
          ) : (
            <span className="shrink-0 text-xs font-medium text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
              Disabled
            </span>
          )}
        </div>

        {totpError && (
          <p className="text-xs text-red-500 mb-3">{totpError}</p>
        )}

        {/* Not enabled — idle */}
        {!me?.totp_enabled && totpStep === "idle" && (
          <button
            onClick={startTotpSetup}
            disabled={totpSetup.isPending}
            className="mt-3 text-sm px-3 py-1.5 rounded-lg ring-1 ring-border bg-surface hover:bg-surface-2 transition font-medium text-foreground disabled:opacity-60"
          >
            Set up 2FA
          </button>
        )}

        {/* Setup step — show secret and code input */}
        {totpStep === "setup" && totpData && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-surface-2 rounded-xl space-y-3">
              <p className="text-xs text-muted font-medium">
                1. Open your authenticator app (Google Authenticator, Authy, etc.) and scan or enter:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={totpData.otpauth_url}
                  className="text-xs text-brand underline break-all hover:opacity-80"
                >
                  Open in authenticator app
                </a>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Or enter this secret key manually:</p>
                <code className="text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-lg block tracking-widest select-all">
                  {totpData.secret}
                </code>
              </div>
            </div>
            <form onSubmit={confirmTotpEnable} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">2. Enter the 6-digit code to verify:</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  className="input font-mono tracking-widest text-center !text-base !py-2"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={totpEnable.isPending || totpCode.length !== 6}
                className="gradient-brand text-white text-sm px-4 py-2 rounded-lg font-semibold disabled:opacity-60 transition"
              >
                Verify & Enable
              </button>
              <button
                type="button"
                onClick={() => { setTotpStep("idle"); setTotpData(null); setTotpError(""); }}
                className="text-sm px-3 py-2 rounded-lg ring-1 ring-border text-muted hover:text-foreground hover:bg-surface-2 transition"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Enabled — show disable option */}
        {me?.totp_enabled && totpStep === "idle" && (
          <button
            onClick={() => { setTotpStep("disabling"); setTotpError(""); }}
            className="mt-3 text-sm px-3 py-1.5 rounded-lg ring-1 ring-red-300 dark:ring-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition font-medium"
          >
            Disable 2FA
          </button>
        )}

        {/* Disable confirmation */}
        {totpStep === "disabling" && (
          <form onSubmit={confirmTotpDisable} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted block mb-1">Confirm your current password to disable 2FA:</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="input"
                value={totpPassword}
                onChange={(e) => setTotpPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={totpDisable.isPending}
              className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60"
            >
              Disable
            </button>
            <button
              type="button"
              onClick={() => { setTotpStep("idle"); setTotpError(""); }}
              className="text-sm px-3 py-2 rounded-lg ring-1 ring-border text-muted hover:text-foreground hover:bg-surface-2 transition"
            >
              Cancel
            </button>
          </form>
        )}
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
