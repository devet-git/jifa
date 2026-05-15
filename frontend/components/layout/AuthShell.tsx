import Link from "next/link";
import { ReactNode } from "react";
import { Check } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: branded hero (hidden on small screens) */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden text-white">
        <div className="absolute inset-0 gradient-brand" />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 60%)" }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 -left-32 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 60%)" }}
        />

        <div className="relative px-12 pt-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-lg">
              J
            </span>
            <span className="text-xl font-bold tracking-tight">Jifa</span>
          </Link>
        </div>

        <div className="relative flex-1 flex flex-col justify-center px-12 pb-16 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">
            Project Management
          </p>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Track your projects.
            <br />
            Smooth. Intuitive.
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-10">
            Backlog, sprint board, roadmap, velocity reports — all in one clean
            workspace. Inspired by Jira, refined for your team.
          </p>

          <ul className="space-y-3 text-sm">
            {[
              "Kanban + Backlog with smooth drag & drop",
              "Velocity, burndown, and cycle-time reports",
              "JQL search and real-time notifications",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-white/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-12 pb-8 text-[11px] text-white/60">
          © {new Date().getFullYear()} Jifa
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only brand mark */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center font-bold text-white text-lg shadow-md shadow-indigo-600/30">
                J
              </span>
              <span className="text-xl font-bold tracking-tight">Jifa</span>
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted mt-1.5">{subtitle}</p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
