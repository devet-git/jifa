"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from "@/hooks/useNotifications";
import { useTokens, useCreateToken, useDeleteToken } from "@/hooks/useTokens";
import { useMe, useUpdateProfile } from "@/hooks/useUsers";
import { useTotpSetup, useTotpEnable, useTotpDisable } from "@/hooks/useTotp";
import { showConfirm } from "@/store/confirm";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/Alert";
import type { ApiToken, NotificationPrefs } from "@/types";

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

const TABS = [
  { id: "account", label: "Account", icon: "user" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "tokens", label: "API Tokens", icon: "key" },
  { id: "integrations", label: "Integrations", icon: "puzzle" },
  { id: "notifications", label: "Notifications", icon: "bell" },
] as const;

const iconPaths: Record<string, string> = {
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  lock: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4 M12 16h.01",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  puzzle: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
};

export default function PreferencesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "account";

  function setTab(id: string) {
    router.replace(`/preferences?tab=${id}`, { scroll: false });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={tab} onValueChange={setTab}>
        {/* Sticky header + tab bar */}
        <div className="sticky top-0 z-10 bg-background pt-8 pb-0 px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Preferences</h1>
            <p className="text-sm text-muted mt-1">
              Manage your profile, security, and integration settings.
            </p>
          </div>

          <TabsList className="mb-8 w-fit overflow-x-auto bg-surface-2">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex items-center gap-2 text-sm px-4 py-2 whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={iconPaths[t.icon]} />
                </svg>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab content — scrolls under sticky header */}
        <div className="px-8 pb-8">
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
          <TabsContent value="tokens">
            <TokensTab />
          </TabsContent>
          <TabsContent value="integrations">
            <MCPTab />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

function AccountTab() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

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
    <div className="surface-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-xs text-muted">Your profile information and avatar</p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fileRef.current?.click()}
          title="Change avatar"
        >
          <Avatar name={me?.name} src={me?.avatar} size="xl" />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function SecurityTab() {
  const { data: me } = useMe();
  const totpSetup = useTotpSetup();
  const totpEnable = useTotpEnable();
  const totpDisable = useTotpDisable();
  const [step, setStep] = useState<"idle" | "setup" | "disabling">("idle");
  const [totpData, setTotpData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpError, setTotpError] = useState("");

  const isSaving = totpSetup.isPending || totpEnable.isPending || totpDisable.isPending;

  async function startSetup() {
    setTotpError("");
    const data = await totpSetup.mutateAsync();
    setTotpData(data);
    setStep("setup");
    setTotpCode("");
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setTotpError("");
    try {
      await totpEnable.mutateAsync(totpCode);
      setStep("idle");
      setTotpData(null);
      setTotpCode("");
    } catch {
      setTotpError("Invalid code — please check your authenticator app.");
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setTotpError("");
    try {
      await totpDisable.mutateAsync(totpPassword);
      setStep("idle");
      setTotpPassword("");
    } catch {
      setTotpError("Incorrect password.");
    }
  }

  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
          <p className="text-xs text-muted">
            {me?.totp_enabled
              ? "2FA is active. Your account requires an authenticator code on login."
              : "Add an extra layer of security with a TOTP authenticator app."}
          </p>
        </div>
        {me?.totp_enabled ? (
          <span className="ml-auto shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 px-2.5 py-1 rounded-full">
            Enabled
          </span>
        ) : (
          <span className="ml-auto shrink-0 text-xs font-medium text-muted bg-surface-2 border border-border px-2.5 py-1 rounded-full">
            Disabled
          </span>
        )}
      </div>

      {totpError && (
        <Alert variant="destructive" className="mb-4 !text-xs">
          {totpError}
        </Alert>
      )}

      {!me?.totp_enabled && step === "idle" && (
        <Button variant="secondary" size="sm" onClick={startSetup} disabled={totpSetup.isPending}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Set up 2FA
        </Button>
      )}

      {step === "setup" && totpData && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-2 rounded-xl space-y-3">
            <p className="text-xs font-medium">1. Open your authenticator app and scan or enter:</p>
            <a
              href={totpData.otpauth_url}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in authenticator app
            </a>
            <div>
              <p className="text-xs text-muted mb-1">Or enter this secret key manually:</p>
              <code className="text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-lg block tracking-widest select-all">
                {totpData.secret}
              </code>
            </div>
          </div>
          <form onSubmit={confirmEnable} className="flex items-end gap-2">
            <div className="flex-1 max-w-60">
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
            <Button type="submit" size="sm" disabled={isSaving || totpCode.length !== 6}>
              Verify & Enable
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setStep("idle"); setTotpData(null); setTotpError(""); }}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      {me?.totp_enabled && step === "idle" && (
        <Button variant="danger" size="sm" onClick={() => { setStep("disabling"); setTotpError(""); }}>
          Disable 2FA
        </Button>
      )}

      {step === "disabling" && (
        <form onSubmit={confirmDisable} className="flex items-end gap-2">
          <div className="flex-1 max-w-60">
            <label className="text-xs text-muted block mb-1">Confirm your password to disable:</label>
            <input
              required
              type="password"
              placeholder="Enter current password"
              className="input"
              value={totpPassword}
              onChange={(e) => setTotpPassword(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" variant="danger" size="sm" disabled={isSaving}>
            Disable
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setStep("idle"); setTotpError(""); }}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

function TokensTab() {
  const { data: tokens = [] } = useTokens();
  const create = useCreateToken();
  const del = useDeleteToken();
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newToken, setNewToken] = useState<ApiToken | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload: { name: string; expires_at?: string } = { name: name.trim() };
    if (expiresAt) payload.expires_at = `${expiresAt}T00:00:00Z`;
    try {
      const token = await create.mutateAsync(payload);
      setNewToken(token);
      setName("");
      setExpiresAt("");
      toast("Token created", "success");
    } catch {
      toast("Failed to create token", "error");
    }
  }

  async function handleDelete(id: number, tokenName: string) {
    const ok = await showConfirm({
      title: "Delete token",
      message: `Revoke "${tokenName}"? This action cannot be undone.`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast("Token deleted", "success");
    } catch {
      toast("Failed to delete token", "error");
    }
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">API Tokens</h2>
            <p className="text-xs text-muted">Personal access tokens for use with the MCP API and other integrations</p>
          </div>
        </div>
      </div>

      {newToken && (
        <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Token created — copy it now</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">You won&apos;t be able to see this token again.</p>
            </div>
            <button onClick={() => setNewToken(null)} className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition">Dismiss</button>
          </div>
          <code className="block text-xs font-mono bg-white dark:bg-amber-950 border border-amber-200 dark:border-amber-500/25 px-3 py-2 rounded-lg select-all break-all">{newToken.token}</code>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-3 px-6 py-4 border-b border-border">
        <div className="flex-1">
          <label className="text-xs text-muted block mb-1">Token name</label>
          <input required className="input !py-1.5 !text-sm" placeholder="e.g. MCP CLI" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="text-xs text-muted block mb-1">Expires (optional)</label>
          <DatePicker
            className="!py-1.5 !text-sm"
            value={expiresAt}
            onChange={setExpiresAt}
          />
        </div>
        <Button type="submit" size="sm" disabled={create.isPending}>Create</Button>
      </form>

      {tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center">
            <svg className="w-6 h-6 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm">No tokens yet.</p>
          <p className="text-xs text-muted">Create one above to get started with MCP integrations.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-2/30 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{t.name}</p>
                  {t.expires_at && new Date(t.expires_at) < new Date() && (
                    <span className="shrink-0 text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 px-1.5 py-0.5 rounded">Expired</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                  <span className="font-mono">…{t.last_chars}</span>
                  {t.expires_at && <span>Expires {new Date(t.expires_at).toLocaleDateString()}</span>}
                  {t.last_used_at && <span>Last used {new Date(t.last_used_at).toLocaleDateString()}</span>}
                  <span>Created {new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="!text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10" onClick={() => handleDelete(t.id, t.name)} disabled={del.isPending}>Delete</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function NotificationsTab() {
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    update.mutate({ [key]: value } as Partial<NotificationPrefs>);
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted">Choose how and when you receive updates</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-4 border-b border-border items-center">
        <div>
          <p className="font-medium text-sm">Daily digest email</p>
          <p className="text-xs text-muted mt-0.5">Receive one summary email per day instead of individual notifications.</p>
        </div>
        <div />
        <div className="flex justify-center">
          <Switch checked={Boolean(prefs?.email_digest)} onCheckedChange={(v) => setPref("email_digest", v)} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-3 border-b border-border bg-surface-2/60 text-[11px] uppercase tracking-wider font-medium text-muted">
        <span>Event</span>
        <span className="text-center">In-app</span>
        <span className="text-center">Email</span>
      </div>
      {ROWS.map((row) => (
        <div key={row.label} className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-4 border-b border-border items-center last:border-b-0 hover:bg-surface-2/30 transition">
          <div>
            <p className="font-medium text-sm">{row.label}</p>
            <p className="text-xs text-muted mt-0.5">{row.description}</p>
          </div>
          <div className="flex justify-center"><Switch checked={Boolean(prefs?.[row.inApp])} onCheckedChange={(v) => setPref(row.inApp, v)} /></div>
          <div className="flex justify-center"><Switch checked={Boolean(prefs?.[row.email])} onCheckedChange={(v) => setPref(row.email, v)} /></div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MCP Integration
// ---------------------------------------------------------------------------

function MCPTab() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  const mcpUrl = `${apiUrl}/mcp/sse`;

  async function copyUrl() {
    await navigator.clipboard.writeText(mcpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function copyConfig(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  const TOOLS = [
    ["list_projects", "List your projects"],
    ["get_project", "Get project details"],
    ["list_issues", "Search/filter issues"],
    ["get_issue", "Get issue details"],
    ["create_issue", "Create a new issue"],
    ["list_sprints", "List project sprints"],
    ["get_sprint", "Get sprint details"],
    ["list_versions", "List project versions"],
    ["get_version", "Get version details"],
    ["list_wiki_pages", "List wiki pages"],
    ["get_wiki_page", "Get wiki content"],
    ["list_members", "List project members"],
    ["add_comment", "Add issue comment"],
  ] as const;

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">MCP Integration</h2>
            <p className="text-xs text-muted">Connect AI coding assistants to Jifa via the Model Context Protocol</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Server URL */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Server URL</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-surface-2 border border-border px-3 py-2 rounded-lg select-all break-all">{mcpUrl}</code>
            <Button variant="secondary" size="sm" onClick={copyUrl}>{copiedUrl ? "Copied" : "Copy"}</Button>
          </div>
        </div>

        {/* Authentication */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Authentication</h3>
          <p className="text-xs text-muted mb-3">
            Create an API token in the <strong>API Tokens</strong> tab, then include it in every MCP request.
          </p>
          <div className="p-3 rounded-lg bg-surface-2 border border-border">
            <code className="text-xs font-mono break-all">Authorization: Bearer &lt;your-token&gt;</code>
          </div>
        </div>

        {/* Client configs */}
        <div className="px-6 py-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Client Configuration</h3>

          <ConfigBlock
            label="Claude Desktop"
            icon={<svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
            config={JSON.stringify({ mcpServers: { jifa: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName="claude_desktop_config.json"
            copyKey="claude"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="VS Code (Cline)"
            icon={<svg className="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5"/></svg>}
            config={JSON.stringify({ name: "jifa", type: "sse", url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } }, null, 2)}
            fileName="cline_mcp_settings.json"
            copyKey="cline"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Continue (VS Code)"
            icon={<svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            config={JSON.stringify({ mcpServers: { jifa: { type: "sse", url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName="config.json"
            copyKey="continue"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Cursor"
            icon={<svg className="w-4 h-4 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10h-10V2z"/></svg>}
            config={JSON.stringify({ mcpServers: { jifa: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName=".cursor/mcp.json"
            copyKey="cursor"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Windsurf"
            icon={<svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 3v9h9"/></svg>}
            config={JSON.stringify({ name: "jifa", type: "sse", transport: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } }, null, 2)}
            fileName=".windsurf/mcp_config.json"
            copyKey="windsurf"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="OpenCode"
            icon={<svg className="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
            config={JSON.stringify({
              mcpServers: {
                jifa: {
                  url: mcpUrl,
                  headers: {
                    Authorization: "Bearer <your-token>",
                  },
                },
              },
            }, null, 2)}
            fileName="opencode.json"
            copyKey="opencode"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Antigravity"
            icon={<svg className="w-4 h-4 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
            config={JSON.stringify({
              name: "jifa",
              transport: "sse",
              serverUrl: mcpUrl,
              headers: {
                Authorization: "Bearer <your-token>",
              },
            }, null, 2)}
            fileName="antigravity.json"
            copyKey="antigravity"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Test with curl"
            icon={<svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
            config={`# Initialize SSE connection
curl -N "${mcpUrl}" \\
  -H "Authorization: Bearer <your-token>"

# In a separate terminal, send a request via POST:
curl -X POST "${apiUrl}/mcp/message" \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -H "Mcp-Session-Id: <session-id>" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
            fileName="Terminal"
            copyKey="curl"
            copiedSection={copiedSection}
            onCopy={copyConfig}
            language="bash"
          />
        </div>

        {/* Tools list */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Available Tools</h3>
          <p className="text-xs text-muted mb-3">The MCP server exposes these 13 tools for AI assistants:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {TOOLS.map(([name, desc]) => (
              <div key={name} className="flex items-center gap-2 py-0.5 text-xs">
                <code className="font-mono text-foreground text-[11px]">{name}</code>
                <span className="text-muted">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfigBlock
// ---------------------------------------------------------------------------

function ConfigBlock({
  label,
  icon,
  config,
  fileName,
  copyKey,
  copiedSection,
  onCopy,
  language,
}: {
  label: string;
  icon: React.ReactNode;
  config: string;
  fileName: string;
  copyKey: string;
  copiedSection: string | null;
  onCopy: (key: string, text: string) => void;
  language?: string;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-2/60 border-b border-border">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted font-mono">{fileName}</span>
          <Button variant="secondary" size="xs" onClick={() => onCopy(copyKey, config)}>
            {copiedSection === copyKey ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className={`text-xs font-mono p-4 overflow-x-auto leading-relaxed ${language === "bash" ? "bg-neutral-900 text-neutral-100" : ""}`}>
        {config}
      </pre>
    </div>
  );
}

