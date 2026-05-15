"use client";

import { useState } from "react";
import Link from "next/link";
import { useJQL } from "@/hooks/useJQL";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { IssueHoverCard } from "@/components/ui/IssueHoverCard";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

const EXAMPLES = [
  `assignee = me AND status != done`,
  `priority IN (high, urgent) AND status = todo`,
  `text ~ "billing"`,
  `label = backend OR label = frontend`,
  `sprint = "Sprint 12" AND type = bug`,
];

export default function AdvancedSearchPage() {
  const [draft, setDraft] = useState(EXAMPLES[0]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { data: results = [], isFetching, error } = useJQL(submitted ?? "");

  function run(q?: string) {
    const v = (q ?? draft).trim();
    if (!v) return;
    if (q !== undefined) setDraft(v);
    setSubmitted(v);
  }

  const errMsg =
    (error as { response?: { data?: { error?: string } } } | null)?.response
      ?.data?.error ?? null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Advanced search</h1>
        <p className="text-sm text-muted mt-1">
          JQL-like queries across all issues you have access to.
        </p>
      </div>

      <div className="surface-card p-4 mb-4">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              run();
            }
          }}
          placeholder="assignee = me AND status != done"
          className="w-full font-mono text-sm bg-surface-2 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-brand focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand)_18%,transparent)] transition"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted inline-flex items-center gap-1.5">
            Run with <span className="kbd">⌘</span>
            <span className="kbd">↵</span>
          </p>
          <button
            onClick={() => run()}
            className="gradient-brand text-white text-sm font-medium rounded-lg px-4 py-1.5 shadow-sm shadow-indigo-600/20 hover:opacity-95 transition"
          >
            Search
          </button>
        </div>
        {errMsg && (
          <Alert variant="destructive" className="mt-3 !text-xs !py-2">
            Syntax error: {errMsg}
          </Alert>
        )}
      </div>

      <div className="mb-5">
        <p className="text-xs text-muted mb-2 uppercase tracking-wider font-medium">
          Examples
        </p>
        <div className="flex gap-2 flex-wrap">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => run(ex)}
              className="text-xs font-mono bg-surface-2 hover:bg-surface-3 ring-1 ring-border rounded-lg px-2.5 py-1.5 transition text-muted hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            Results{" "}
            <span className="text-muted font-normal">
              ({results.length}
              {results.length === 200 ? "+" : ""})
            </span>
          </h2>
          {isFetching && (
            <span className="text-xs text-muted inline-flex items-center gap-1.5">
              <Spinner className="w-3 h-3" />
              Searching…
            </span>
          )}
        </div>
        {!submitted ? (
          <p className="px-4 py-12 text-center text-sm text-muted italic">
            Enter a query and press Search.
          </p>
        ) : results.length === 0 && !isFetching ? (
          <p className="px-4 py-12 text-center text-sm text-muted italic">
            No matches.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/projects/${i.project_id}`}
                  className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-surface-2 transition group"
                >
                  <IssueHoverCard issue={i} side="right" align="start">
                    <span className="font-mono text-[11px] text-muted bg-surface-2 px-2 py-1 rounded shrink-0 w-20 text-center">
                      {i.key ?? `#${i.id}`}
                    </span>
                  </IssueHoverCard>
                  <span className="flex-1 truncate group-hover:text-brand transition">
                    {i.title}
                  </span>
                  <Badge type="status" value={i.status} showDot />
                  {i.assignee && (
                    <UserHoverCard user={i.assignee} side="left">
                      <Avatar name={i.assignee.name} size="sm" />
                    </UserHoverCard>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="mt-6 surface-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">
          Syntax reference
        </summary>
        <div className="mt-3 space-y-2 text-muted">
          <p>
            <b className="text-foreground">Fields:</b>{" "}
            <code className="font-mono text-xs">
              assignee, reporter, status, priority, type, sprint, version, component, label, text, key
            </code>
          </p>
          <p>
            <b className="text-foreground">Operators:</b>{" "}
            <code className="font-mono text-xs">=</code>,{" "}
            <code className="font-mono text-xs">!=</code>,{" "}
            <code className="font-mono text-xs">~</code> (text contains),{" "}
            <code className="font-mono text-xs">IN (a, b)</code>,{" "}
            <code className="font-mono text-xs">NOT IN (a, b)</code>
          </p>
          <p>
            <b className="text-foreground">Boolean:</b>{" "}
            <code className="font-mono text-xs">AND</code>,{" "}
            <code className="font-mono text-xs">OR</code>, parentheses
          </p>
          <p>
            <b className="text-foreground">Special:</b>{" "}
            <code className="font-mono text-xs">= me</code> for the current user,{" "}
            <code className="font-mono text-xs">= null</code> for unassigned
          </p>
          <p>
            <b className="text-foreground">Strings:</b> use double quotes for values with spaces.
          </p>
        </div>
      </details>
    </div>
  );
}
