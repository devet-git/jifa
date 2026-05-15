"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useProjects } from "@/hooks/useProject";
import { cn } from "@/lib/utils";
import { useState, useMemo, type ReactNode } from "react";

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
  const [projectSearch, setProjectSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const starred = projects.filter((p) => p.is_starred);
  const filtered = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q),
    );
  }, [projects, projectSearch]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const cat = p.category || "";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showSearch = projects.length > 6;

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
          <svg
            width="32" height="32" viewBox="0 0 40 40" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 rounded-lg shadow-lg shadow-indigo-600/30"
          >
            <defs>
              <linearGradient id="jf-sidebar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="9" fill="url(#jf-sidebar)"/>
            <g stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5,32 L9.5,8 L29,8 L29,26 C29,34 18,35 16,29"/>
              <line x1="9.5" y1="20" x2="20" y2="20"/>
            </g>
          </svg>
          <span className="text-lg font-bold tracking-tight text-white">
            Jifa
          </span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col px-3 py-4 relative min-h-0">
        <div className="shrink-0 space-y-0.5">
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
        </div>

        <div className="shrink-0 mt-5 px-3 mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Projects
          </p>
          {showSearch && (
            <button
              onClick={() => {
                const input = document.getElementById("sidebar-project-search");
                input?.focus();
              }}
              className="text-slate-500 hover:text-slate-300 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {showSearch && (
          <div className="shrink-0 px-3 mb-2">
            <input
              id="sidebar-project-search"
              type="text"
              placeholder="Filter projects…"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {groups.size === 0 && (
            <p className="px-3 py-6 text-xs text-slate-500 text-center">No projects found.</p>
          )}
          {Array.from(groups.entries()).map(([cat, items]) => {
            const isCollapsed = collapsed.has(cat || "__ungrouped__");
            const key = cat || "__ungrouped__";
            return (
              <div key={key} className="mb-1">
                <button
                  onClick={() => toggleCollapse(key)}
                  className="flex items-center gap-1.5 w-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition"
                >
                  <svg
                    className={cn("w-2.5 h-2.5 transition-transform shrink-0", isCollapsed && "-rotate-90")}
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <path d="M3 1l4 4-4 4" />
                  </svg>
                  {cat || "Ungrouped"}
                  <span className="text-[10px] text-slate-600 ml-auto">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {items.map((p) => {
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
                          <span className="font-medium truncate flex-1 min-w-0">{p.name}</span>
                          {p.is_starred && (
                            <svg className="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
