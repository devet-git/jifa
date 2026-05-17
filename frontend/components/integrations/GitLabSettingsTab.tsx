"use client";

import { useState, useEffect } from "react";
import {
  useGitLabIntegration,
  useUpsertGitLabIntegration,
  useDisconnectGitLabIntegration,
  useTestGitLabIntegration,
  useRevealGitLabSecret,
  useRotateGitLabSecret,
  useSetGitLabEnabled,
} from "@/hooks/useGitLab";
import { useStatuses } from "@/hooks/useStatuses";
import { useProject } from "@/hooks/useProject";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "sonner";
import {
  GitBranch,
  Check,
  X,
  AlertTriangle,
  Copy,
  Loader2,
} from "lucide-react";
import type { GitLabIntegration, GitLabIntegrationInput } from "@/types";

const NONE = "__none__";

export function GitLabSettingsTab({ projectId }: { projectId: string }) {
  const { data: integ, isLoading } = useGitLabIntegration(projectId);
  const { data: project } = useProject(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const upsert = useUpsertGitLabIntegration(projectId);
  const disconnect = useDisconnectGitLabIntegration(projectId);
  const setEnabled = useSetGitLabEnabled(projectId);
  const testConn = useTestGitLabIntegration(projectId);
  const reveal = useRevealGitLabSecret(projectId);
  const rotate = useRotateGitLabSecret(projectId);

  const configured = (() => {
    if (!integ) return false;
    if ("configured" in integ && integ.configured === false) return false;
    return true;
  })();
  const config = configured ? (integ as GitLabIntegration) : null;

  const [form, setForm] = useState<GitLabIntegrationInput>({
    base_url: "https://gitlab.com",
    repo_path: "",
    access_token: "",
    on_mr_opened_status_key: "",
    on_mr_merged_status_key: "",
    on_mr_closed_status_key: "",
  });

  // Watch each field (not just config.id) so the form re-syncs after Save.
  useEffect(() => {
    if (config) {
      setForm((f) => ({
        ...f,
        base_url: config.base_url,
        repo_path: config.repo_path,
        access_token: "",
        on_mr_opened_status_key: config.on_mr_opened_status_key,
        on_mr_merged_status_key: config.on_mr_merged_status_key,
        on_mr_closed_status_key: config.on_mr_closed_status_key,
      }));
    }
  }, [
    config?.id,
    config?.base_url,
    config?.repo_path,
    config?.on_mr_opened_status_key,
    config?.on_mr_merged_status_key,
    config?.on_mr_closed_status_key,
  ]);

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    { ok: boolean; user?: string; error?: string } | null
  >(null);
  const [showDisconnect, setShowDisconnect] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await upsert.mutateAsync(form);
      if (res.webhook_secret) {
        setRevealedSecret(res.webhook_secret);
      }
      toast.success(configured ? "Integration updated" : "GitLab connected");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Failed to save");
    }
  }

  async function handleTest() {
    setTestResult(null);
    try {
      const res = await testConn.mutateAsync();
      setTestResult(res);
      if (res.ok) toast.success(`Connected as ${res.user ?? "user"}`);
      else toast.error(res.error ?? "Connection failed");
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Test failed";
      setTestResult({ ok: false, error: msg });
      toast.error(msg);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync();
      setShowDisconnect(false);
      setRevealedSecret(null);
      setTestResult(null);
      toast.success("GitLab disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">
            GitLab integration
          </h2>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Link branches, merge requests, and commits to issues. Reference{" "}
            <code className="px-1 py-0.5 rounded bg-surface-2 text-foreground">
              {project?.key ?? "PROJ"}-NN
            </code>{" "}
            in commit messages or MR titles to auto-link.
          </p>
        </div>
        {configured && config?.enabled === false ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Paused
          </span>
        ) : configured ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-2 text-muted border border-border">
            Not connected
          </span>
        )}
      </div>

      {/* Empty state */}
      {!configured && (
        <div className="rounded-lg border border-dashed border-border bg-surface-2/50 p-4 text-sm text-muted">
          <p className="mb-1 font-medium text-foreground">Before you start</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>
              In GitLab → Settings → Access Tokens, create a Project Access
              Token with scopes <code>api</code>, <code>read_repository</code>,
              and <code>write_repository</code>.
            </li>
            <li>Copy the token now — GitLab only shows it once.</li>
            <li>Fill the form below and click <strong>Save & Test</strong>.</li>
          </ol>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="GitLab base URL"
          hint="https://gitlab.com for SaaS, or your self-hosted URL."
        >
          <input
            type="url"
            required
            value={form.base_url}
            onChange={(e) =>
              setForm({ ...form, base_url: e.target.value })
            }
            placeholder="https://gitlab.com"
            className={inputCls}
          />
        </Field>

        <Field
          label="Repository path"
          hint="The namespace/project portion of the GitLab URL."
        >
          <input
            type="text"
            required
            value={form.repo_path}
            onChange={(e) =>
              setForm({ ...form, repo_path: e.target.value })
            }
            placeholder="my-group/my-repo"
            className={inputCls}
          />
        </Field>

        <Field
          label={`Project access token${configured ? " (leave blank to keep current)" : ""}`}
          hint="Scopes required: api, read_repository, write_repository."
        >
          <input
            type="password"
            required={!configured}
            value={form.access_token}
            onChange={(e) =>
              setForm({ ...form, access_token: e.target.value })
            }
            placeholder={configured ? "•••••••••• (stored)" : "glpat-..."}
            className={inputCls}
            autoComplete="new-password"
          />
        </Field>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground mb-1.5">
            Auto-transition on MR events
          </p>
          <p className="text-xs text-muted mb-3">
            When a merge request linked to an issue changes state, Jifa can
            automatically change the issue&apos;s status. Leave blank to skip.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <StatusMapField
              label="MR opened →"
              value={form.on_mr_opened_status_key || NONE}
              onChange={(v) =>
                setForm({
                  ...form,
                  on_mr_opened_status_key: v === NONE ? "" : v,
                })
              }
              statuses={statuses}
            />
            <StatusMapField
              label="MR merged →"
              value={form.on_mr_merged_status_key || NONE}
              onChange={(v) =>
                setForm({
                  ...form,
                  on_mr_merged_status_key: v === NONE ? "" : v,
                })
              }
              statuses={statuses}
            />
            <StatusMapField
              label="MR closed →"
              value={form.on_mr_closed_status_key || NONE}
              onChange={(v) =>
                setForm({
                  ...form,
                  on_mr_closed_status_key: v === NONE ? "" : v,
                })
              }
              statuses={statuses}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" variant="primary" loading={upsert.isPending}>
            {configured ? "Update" : "Save & Connect"}
          </Button>
          {configured && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                loading={testConn.isPending}
              >
                Test connection
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={setEnabled.isPending}
                onClick={async () => {
                  const next = !(config?.enabled ?? true);
                  try {
                    await setEnabled.mutateAsync(next);
                    toast.success(
                      next
                        ? "Integration enabled"
                        : "Integration paused — config kept",
                    );
                  } catch {
                    toast.error("Failed to update state");
                  }
                }}
                className="ml-auto"
              >
                {config?.enabled === false ? "Enable" : "Pause"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDisconnect(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </form>

      {/* Test result inline */}
      {testResult && (
        <div
          className={
            "rounded-lg border px-3 py-2 text-xs flex items-start gap-2 " +
            (testResult.ok
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300")
          }
        >
          {testResult.ok ? (
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <X className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>
            {testResult.ok
              ? `Connected as ${testResult.user ?? "user"}.`
              : testResult.error ?? "Connection failed."}
          </span>
        </div>
      )}

      {/* Webhook setup card */}
      {configured && (
        <div className="rounded-lg border border-border bg-surface-2/50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Set up the inbound webhook in GitLab
            </p>
            <p className="text-xs text-muted mt-0.5">
              GitLab will notify Jifa when you push commits or open MRs. Paste
              these two values in GitLab → Settings → Webhooks → Add new
              webhook.
            </p>
          </div>

          <CopyRow
            label="Webhook URL"
            value={config?.webhook_url ?? ""}
            onCopy={() =>
              copy(config?.webhook_url ?? "", "Webhook URL")
            }
          />

          {revealedSecret ? (
            <CopyRow
              label="Secret token"
              value={revealedSecret}
              warn
              onCopy={() => copy(revealedSecret, "Secret")}
            />
          ) : (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-muted">
                Secret token
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  loading={reveal.isPending}
                  onClick={async () => {
                    try {
                      const res = await reveal.mutateAsync();
                      setRevealedSecret(res.webhook_secret);
                    } catch {
                      toast.error("Could not reveal secret");
                    }
                  }}
                >
                  Reveal current secret
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  loading={rotate.isPending}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Rotate the webhook secret? The old value will stop working immediately — you must paste the new value into GitLab.",
                      )
                    )
                      return;
                    try {
                      const res = await rotate.mutateAsync();
                      setRevealedSecret(res.webhook_secret);
                      toast.success(
                        "Secret rotated. Update GitLab webhook with the new value.",
                      );
                    } catch {
                      toast.error("Could not rotate secret");
                    }
                  }}
                  className="text-amber-700 hover:text-amber-800 dark:text-amber-300"
                >
                  Rotate
                </Button>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                If GitLab webhook returns 401, the secret in GitLab doesn&apos;t
                match Jifa&apos;s. Reveal and re-paste it, or rotate to get a
                fresh one.
              </p>
            </div>
          )}

          <div className="text-xs text-muted leading-relaxed">
            In GitLab webhook settings, enable these triggers:{" "}
            <strong className="text-foreground">Push events</strong>,{" "}
            <strong className="text-foreground">
              Merge request events
            </strong>
            , <strong className="text-foreground">Comments</strong>. Keep SSL
            verification ON.
          </div>
        </div>
      )}

      {showDisconnect && (
        <Modal
          open
          onClose={() => setShowDisconnect(false)}
          title="Disconnect GitLab integration"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted leading-relaxed">
                The stored token, webhook secret, and status mapping will be
                deleted permanently. Linked branches, MRs, and commits become
                read-only snapshots on issues. Reconnecting requires
                re-entering all details — if you only want to pause inbound
                events temporarily, use <strong>Pause</strong> instead.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisconnect(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                loading={disconnect.isPending}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls =
  "w-full text-sm px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 transition";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-foreground mb-1">{label}</div>
      {children}
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </label>
  );
}

function StatusMapField({
  label,
  value,
  onChange,
  statuses,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  statuses: { key: string; name: string }[];
}) {
  // Radix Select labels the trigger from the mounted SelectItem matching
  // value. Defer mount until statuses load, and surface stale values so
  // a deleted/renamed status still labels correctly instead of showing
  // the placeholder.
  if (statuses.length === 0) {
    return (
      <div>
        <div className="text-xs font-medium text-foreground mb-1">{label}</div>
        <div className="w-full h-9 text-xs px-3 flex items-center rounded-md border border-border bg-surface text-muted">
          Loading…
        </div>
      </div>
    );
  }
  const hasCurrent =
    value === NONE || statuses.some((s) => s.key === value);
  return (
    <div>
      <div className="text-xs font-medium text-foreground mb-1">{label}</div>
      {/* key={value} forces remount so Radix re-binds the trigger label
          when value arrives asynchronously from React Query. */}
      <Select key={value} value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-9 text-xs">
          <SelectValue placeholder="No change" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted">No change</span>
          </SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.name}
            </SelectItem>
          ))}
          {!hasCurrent && value && (
            <SelectItem key={value} value={value}>
              <span className="text-amber-600 dark:text-amber-400">
                {value} (missing)
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function CopyRow({
  label,
  value,
  warn,
  onCopy,
}: {
  label: string;
  value: string;
  warn?: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted mb-1">{label}</div>
      <div className="flex items-stretch gap-1">
        <code
          className={
            "flex-1 truncate text-xs px-2.5 py-1.5 rounded border bg-surface font-mono " +
            (warn
              ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
              : "border-border text-foreground")
          }
        >
          {value}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={onCopy}
          className="!h-auto"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      {warn && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
          This secret is shown only once. Copy it now and paste into GitLab.
        </p>
      )}
    </div>
  );
}