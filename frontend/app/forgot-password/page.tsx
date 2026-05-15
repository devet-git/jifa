"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { AuthShell } from "@/components/layout/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>If your email is registered, you'll receive a reset link shortly.</span>
          </div>
          <Link href="/login" className="block text-center text-sm text-brand hover:underline font-medium">
            Back to login
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-brand text-white py-2.5 rounded-lg font-semibold shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
            >
              {loading && <Spinner className="w-4 h-4" />}
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="text-brand font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
