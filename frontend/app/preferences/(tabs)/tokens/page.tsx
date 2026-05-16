"use client";

import { useState } from "react";
import { useTokens, useCreateToken, useDeleteToken } from "@/hooks/useTokens";
import { showConfirm } from "@/store/confirm";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";
import { KeyRound, Trash2 } from "lucide-react";
import type { ApiToken } from "@/types";

export default function TokensPage() {
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
            <KeyRound className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">API Tokens</h2>
            <p className="text-xs text-muted">Personal access tokens for use with the MCP API and other integrations</p>
          </div>
        </div>
      </div>

      {newToken && (
        <Alert variant="warning" className="mx-6 mt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <AlertTitle className="text-xs font-semibold">
                Token created — copy it now
              </AlertTitle>
              <AlertDescription className="text-xs mt-0.5">
                You won&apos;t be able to see this token again.
              </AlertDescription>
            </div>
            <button
              onClick={() => setNewToken(null)}
              className="text-xs opacity-80 hover:opacity-100 transition"
            >
              Dismiss
            </button>
          </div>
          <code className="block text-xs font-mono bg-white dark:bg-amber-950 border border-amber-200 dark:border-amber-500/25 px-3 py-2 rounded-lg select-all break-all">
            {newToken.token}
          </code>
        </Alert>
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
        <div className="py-8">
          <EmptyState
            icon={defaultIcons.lock}
            title="No tokens yet"
            description="Create a token above to get started with MCP integrations."
            compact
          />
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
              <Button variant="ghost" size="sm" className="!text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10" onClick={() => handleDelete(t.id, t.name)} disabled={del.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
