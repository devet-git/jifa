"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AuthShell } from "@/components/layout/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

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
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Authenticator code
            </label>
            <input
              name="totp_code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
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
            {loading && <Spinner className="w-4 h-4" />}
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
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
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
            id="login-password"
            name="password"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
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
          {loading && <Spinner className="w-4 h-4" />}
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
