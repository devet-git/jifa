"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { useProjects } from "@/hooks/useProject";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  SquareCheckBig,
  Folder,
  Search,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Plus,
} from "lucide-react";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const iconClass = "w-[18px] h-[18px] shrink-0";
const STORAGE_KEY = "jifa-sidebar-collapsed";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className={iconClass} /> },
  { href: "/my-issues", label: "My issues", icon: <SquareCheckBig className={iconClass} /> },
  { href: "/search", label: "Advanced search", icon: <Search className={iconClass} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: projects = [] } = useProjects();
  const [projectSearch, setProjectSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rail, setRail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Hydrate rail state from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setRail(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleRail() {
    setRail((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
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

  const showSearch = projects.length > 6 && !rail;

  // Wrap a node in a tooltip only when rail mode is active.
  function maybeTooltip(content: ReactNode, children: ReactNode) {
    if (!rail) return <>{children}</>;
    return (
      <Tooltip content={content} position="right">
        {children}
      </Tooltip>
    );
  }

  return (
    <aside
      data-rail={rail ? "true" : "false"}
      className={cn(
        "h-screen flex flex-col relative overflow-hidden shrink-0 transition-[width] duration-200 ease-out",
        "bg-surface text-foreground border-r border-[var(--border)]",
        rail ? "w-[64px]" : "w-60",
      )}
    >
      {/* Decorative ambient glow — softer, theme-aware */}
      <div
        aria-hidden
        className="absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-[0.18] blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 -right-12 w-60 h-60 rounded-full opacity-[0.12] blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
        }}
      />

      {/* Header: logo + collapse toggle. Fixed h-14 so it lines up with the
          app's sticky TopBar (which is also h-14) regardless of rail state. */}
      <div
        className={cn(
          "relative h-14 shrink-0 border-b border-[var(--border)] flex items-center",
          rail ? "px-2 justify-center" : "px-4 justify-between gap-2",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 min-w-0",
            rail && "justify-center w-full",
          )}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 rounded-lg shadow-md shadow-indigo-600/20"
          >
            <defs>
              <linearGradient id="jf-sidebar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="9" fill="url(#jf-sidebar)" />
            <g stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5,32 L9.5,8 L29,8 L29,26 C29,34 18,35 16,29" />
              <line x1="9.5" y1="20" x2="20" y2="20" />
            </g>
          </svg>
          {!rail && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              Jifa
            </span>
          )}
        </Link>
        {!rail && (
          <Tooltip content="Collapse sidebar" position="right">
            <button
              onClick={toggleRail}
              aria-label="Collapse sidebar"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] transition shrink-0"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Floating expand button when in rail mode */}
      {rail && (
        <div className="px-2 pt-2 flex justify-center">
          <Tooltip content="Expand sidebar" position="right">
            <button
              onClick={toggleRail}
              aria-label="Expand sidebar"
              className="w-9 h-7 rounded-md flex items-center justify-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] transition"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 flex flex-col py-4 relative min-h-0",
          rail ? "px-2" : "px-3",
        )}
      >
        <div className="shrink-0 space-y-0.5">
          {!rail && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Workspace
            </p>
          )}
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "group flex items-center rounded-lg text-sm transition relative",
                  rail ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2",
                  active
                    ? "bg-[var(--brand-soft)] text-foreground"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-foreground",
                )}
              >
                {active && !rail && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r gradient-brand"
                  />
                )}
                <span
                  className={cn(
                    "transition-colors",
                    active
                      ? "text-[var(--brand)]"
                      : "text-[var(--muted-2)] group-hover:text-foreground",
                  )}
                >
                  {item.icon}
                </span>
                {!rail && <span className="font-medium">{item.label}</span>}
              </Link>
            );
            return (
              <div key={item.href}>{maybeTooltip(item.label, link)}</div>
            );
          })}
        </div>

        {!rail && (
          <div className="shrink-0 mt-5 px-3 mb-2 flex items-center justify-between gap-1">
            <Link
              href="/projects"
              className={cn(
                "text-xs font-semibold uppercase tracking-wider hover:text-foreground transition",
                pathname === "/projects"
                  ? "text-foreground"
                  : "text-[var(--muted)]",
              )}
            >
              Projects
            </Link>
            <div className="flex items-center gap-0.5">
              {showSearch && (
                <Tooltip content="Filter projects" position="right">
                  <button
                    onClick={() => {
                      const input = document.getElementById(
                        "sidebar-project-search",
                      );
                      input?.focus();
                    }}
                    aria-label="Filter projects"
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              )}
              <Tooltip content="New project" position="right">
                <button
                  onClick={() => setShowCreate(true)}
                  aria-label="New project"
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {rail && (
          <>
            <div className="my-3 mx-2 border-t border-[var(--border)]" />
            <div className="space-y-1 mb-2">
              <Tooltip content="All projects" position="right">
                <Link
                  href="/projects"
                  aria-label="All projects"
                  className={cn(
                    "flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition",
                    pathname === "/projects"
                      ? "bg-[var(--brand-soft)] text-foreground"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-foreground",
                  )}
                >
                  <Folder className={iconClass} />
                </Link>
              </Tooltip>
              <Tooltip content="New project" position="right">
                <button
                  onClick={() => setShowCreate(true)}
                  aria-label="New project"
                  className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-foreground transition"
                >
                  <Plus className={iconClass} />
                </button>
              </Tooltip>
            </div>
          </>
        )}

        {showSearch && (
          <div className="shrink-0 px-3 mb-2">
            <input
              id="sidebar-project-search"
              type="text"
              placeholder="Filter projects…"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--brand)_22%,transparent)] transition"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {!rail && groups.size === 0 && (
            <p className="px-3 py-6 text-xs text-[var(--muted)] text-center">
              No projects found.
            </p>
          )}
          {Array.from(groups.entries()).map(([cat, items]) => {
            const key = cat || "__ungrouped__";
            const isCollapsed = collapsed.has(key);
            return (
              <div key={key} className="mb-1">
                {!rail && (
                  <button
                    onClick={() => toggleCollapse(key)}
                    className="flex items-center gap-1.5 w-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-foreground transition"
                  >
                    <ChevronDown
                      className={cn(
                        "w-2.5 h-2.5 transition-transform shrink-0",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    {cat || "Ungrouped"}
                    <span className="text-[11px] text-[var(--muted-2)] ml-auto">
                      {items.length}
                    </span>
                  </button>
                )}
                {(!isCollapsed || rail) && (
                  <div className={cn(rail ? "space-y-1" : "space-y-0.5")}>
                    {items.map((p) => {
                      const href = `/projects/${p.id}`;
                      const active = pathname.startsWith(href);
                      const link = (
                        <Link
                          href={href}
                          aria-label={p.name}
                          className={cn(
                            "group flex items-center rounded-lg text-sm transition",
                            rail
                              ? "justify-center w-10 h-10 mx-auto"
                              : "gap-3 px-3 py-2",
                            active
                              ? "bg-[var(--brand-soft)] text-foreground"
                              : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "shrink-0 rounded gradient-brand text-white font-bold flex items-center justify-center",
                              rail
                                ? "w-6 h-6 text-[10px]"
                                : "w-[18px] h-[18px] text-[9px]",
                            )}
                          >
                            {p.key.slice(0, 2)}
                          </span>
                          {!rail && (
                            <>
                              <span className="font-medium truncate flex-1 min-w-0">
                                {p.name}
                              </span>
                              {p.is_starred && (
                                <Star className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />
                              )}
                            </>
                          )}
                        </Link>
                      );
                      return (
                        <div key={p.id}>
                          {maybeTooltip(
                            <span className="flex items-center gap-1.5">
                              {p.name}
                              {p.is_starred && (
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              )}
                            </span>,
                            link,
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </aside>
  );
}
