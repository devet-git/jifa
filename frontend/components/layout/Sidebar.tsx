"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useProjects } from "@/hooks/useProject";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const iconClass = "w-[18px] h-[18px] shrink-0";

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/my-issues",
    label: "My issues",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Advanced search",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: projects = [] } = useProjects();
  const starred = projects.filter((p) => p.is_starred).slice(0, 6);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-[#0b1024] text-slate-200 border-r border-white/5 relative overflow-hidden shrink-0">
      {/* Decorative ambient glow */}
      <div
        aria-hidden
        className="absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 -right-12 w-60 h-60 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 60%)" }}
      />

      <div className="px-5 py-5 border-b border-white/5 relative">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            J
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Jifa
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 relative">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition relative",
                active
                  ? "bg-white/5 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r gradient-brand"
                />
              )}
              <span
                className={cn(
                  "transition-colors",
                  active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300",
                )}
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {starred.length > 0 && (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Starred
            </p>
            {starred.map((p) => {
              const href = `/projects/${p.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={p.id}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                    active
                      ? "bg-white/5 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span className="w-[18px] h-[18px] shrink-0 rounded gradient-brand text-white text-[9px] font-bold flex items-center justify-center">
                    {p.key.slice(0, 2)}
                  </span>
                  <span className="font-medium truncate">{p.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-3 pb-3 relative">
        <div className="rounded-xl p-3 bg-white/5 border border-white/5 flex items-center gap-3">
          <Avatar name={user?.name} size="sm" className="ring-2 ring-indigo-500/40" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name ?? "Guest"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email ?? "Not signed in"}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <Link href="/preferences" className="hover:text-white transition">
            Preferences
          </Link>
          <button
            onClick={handleLogout}
            className="hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
