"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useMe, useChangePassword } from "@/hooks/useUsers";
import { useTotpSetup, useTotpEnable, useTotpDisable } from "@/hooks/useTotp";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ExternalLink, KeyRound, Lock, Shield } from "lucide-react";

export default function SecurityPage() {
  const { data: me } = useMe();
  const changePassword = useChangePassword();
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const totpSetup = useTotpSetup();
  const totpEnable = useTotpEnable();
  const totpDisable = useTotpDisable();
  const [step, setStep] = useState<"idle" | "setup" | "disabling">("idle");
  const [totpData, setTotpData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpError, setTotpError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  const isSaving = totpSetup.isPending || totpEnable.isPending || totpDisable.isPending;

  useEffect(() => {
    if (!totpData?.otpauth_url) return;
    let cancelled = false;
    QRCode.toDataURL(totpData.otpauth_url, { width: 200, margin: 2 })
      .then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl); })
      .catch(() => { if (!cancelled) setQrDataUrl(""); });
    return () => { cancelled = true; };
  }, [totpData]);

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwNew !== pwConfirm) {
      setPwError("New passwords do not match.");
      return;
    }
    try {
      await changePassword.mutateAsync({ current_password: pwCurrent, new_password: pwNew });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      toast("Password updated", "success");
    } catch (err: any) {
      setPwError(err.response?.data?.error ?? "Failed to change password");
    }
  }

  return (
    <div className="space-y-6">
      {/* 2FA */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-emerald-500" />
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
            <Shield className="w-3.5 h-3.5" />
            Set up 2FA
          </Button>
        )}

        {step === "setup" && totpData && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-2 rounded-xl space-y-4">
              <p className="text-xs font-medium">1. Scan this QR code with your authenticator app:</p>
              {qrDataUrl ? (
                <div className="flex justify-center">
                  <img
                    src={qrDataUrl}
                    alt="TOTP QR Code"
                    className="rounded-lg bg-white p-2"
                    width={200}
                    height={200}
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-[200px] h-[200px] rounded-lg bg-surface animate-pulse" />
                </div>
              )}
              <div className="text-center">
                <a
                  href={totpData.otpauth_url}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in authenticator app
                </a>
              </div>
              <details className="group">
                <summary className="text-xs text-muted cursor-pointer hover:text-foreground transition-colors select-none">
                  Or enter the secret key manually
                </summary>
                <code className="mt-2 text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-lg block tracking-widest select-all">
                  {totpData.secret}
                </code>
              </details>
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

      {/* Change Password */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Change Password</h2>
            <p className="text-xs text-muted">Update your login password</p>
          </div>
        </div>

        {pwError && (
          <Alert variant="destructive" className="mb-4 !text-xs">
            {pwError}
          </Alert>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
          <div>
            <label className="text-xs text-muted block mb-1">Current password</label>
            <input
              required
              type="password"
              className="input !py-1.5 !text-sm w-full"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">New password (min. 8 characters)</label>
            <input
              required
              type="password"
              minLength={8}
              className="input !py-1.5 !text-sm w-full"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Confirm new password</label>
            <input
              required
              type="password"
              minLength={8}
              className="input !py-1.5 !text-sm w-full"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Saving…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
