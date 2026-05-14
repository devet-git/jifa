"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AuthShell } from "@/components/layout/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = totpRequired
        ? { ...form, totp_code: totpCode }
        : form;
      const { data, status } = await api.post("/auth/login", payload);
      if (status === 202 && data.totp_required) {
        setTotpRequired(true);
        setLoading(false);
        return;
      }
      setAuth(data.user, data.token);
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.response?.data?.error === "invalid authenticator code") {
        setError("Invalid authenticator code. Please try again.");
      } else {
        setError("Incorrect email or password.");
        setTotpRequired(false);
        setTotpCode("");
      }
    } finally {
      setLoading(false);
    }
  }

  if (totpRequired) {
    return (
      <AuthShell
        title="Two-Factor Authentication"
        subtitle="Enter the 6-digit code from your authenticator app."
      >
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Authenticator code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              className="input font-mono tracking-widest text-center !text-xl !py-3"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <button
            type="submit"
            disabled={loading || totpCode.length !== 6}
            className="w-full gradient-brand text-white py-2.5 rounded-lg font-semibold shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {loading ? "Verifying…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => { setTotpRequired(false); setTotpCode(""); setError(""); }}
            className="w-full text-sm text-muted hover:text-foreground transition"
          >
            ← Back
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue managing your projects."
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Email
          </label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted">Password</label>
            <div className="flex items-center gap-3">
              <Link href="/forgot-password" className="text-xs text-muted hover:text-brand transition">
                Forgot password?
              </Link>
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="text-xs text-brand hover:underline font-medium"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <input
            type={showPwd ? "text" : "password"}
            required
            placeholder="••••••••"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-brand text-white py-2.5 rounded-lg font-semibold shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand font-medium hover:underline">
          Sign up for free
        </Link>
      </p>
    </AuthShell>
  );
}
