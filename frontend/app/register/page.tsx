"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AuthShell } from "@/components/layout/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      setAuth(data.user, data.token);
      router.push("/dashboard");
    } catch {
      setError("Email đã được sử dụng hoặc thông tin không hợp lệ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Tạo tài khoản Jifa"
      subtitle="Bắt đầu quản lý dự án trong vài giây."
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
            Họ tên
          </label>
          <input
            type="text"
            required
            placeholder="Nguyễn Văn A"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
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
            <label className="text-xs font-medium text-muted">Mật khẩu</label>
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="text-xs text-brand hover:underline font-medium"
            >
              {showPwd ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <input
            type={showPwd ? "text" : "password"}
            required
            minLength={8}
            placeholder="Ít nhất 8 ký tự"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="text-[11px] text-muted mt-1.5">Tối thiểu 8 ký tự</p>
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
          {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
