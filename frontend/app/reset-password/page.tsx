"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell } from "@/components/layout/AuthShell";
import { Check } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Invalid or expired reset link.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-muted">No reset token found in the URL.</p>
        <Link href="/forgot-password" className="text-brand font-medium hover:underline text-sm">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300">
        <Check className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Password reset successfully! Redirecting to login…</span>
      </div>
    );
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">New password</label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="Repeat your new password"
            className="input"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-brand text-white py-2.5 rounded-lg font-semibold shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
        >
          {loading && <Spinner className="w-4 h-4" />}
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set new password" subtitle="Choose a strong password for your account.">
      <Suspense fallback={<div className="py-8 text-center text-sm text-muted">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
