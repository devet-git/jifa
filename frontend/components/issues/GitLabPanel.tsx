"use client";

import { useState } from "react";
import {
  useIssueExternalRefs,
  useDeleteExternalRef,
} from "@/hooks/useGitLab";
import { usePermissionsStore } from "@/store/permissions";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  GitBranch,
  GitCommit,
  ExternalLink,
  Trash2,
  Link2,
  GitPullRequestArrow,
} from "lucide-react";
import type { Issue, IssueExternalRef, ExternalRefType } from "@/types";
import { LinkExternalRefModal } from "./LinkExternalRefModal";
import { CreateBranchModal } from "./CreateBranchModal";

interface Props {
  issue: Issue;
}

const TYPE_META: Record<
  ExternalRefType,
  { label: string; icon: typeof GitBranch }
> = {
  branch: { label: "Branches", icon: GitBranch },
  mr: { label: "Merge requests", icon: GitPullRequestArrow },
  commit: { label: "Commits", icon: GitCommit },
};

const STATE_BADGE: Record<string, string> = {
  opened:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  merged:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  closed:
    "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

export function GitLabPanel({ issue }: Props) {
  const { data: refs = [], isLoading } = useIssueExternalRefs(issue.id);
  const remove = useDeleteExternalRef(issue.id);
  const can = usePermissionsStore((s) => s.can);
  const canManage = can("issue.manage-link");

  const [showLink, setShowLink] = useState(false);
  const [showBranch, setShowBranch] = useState(false);

  const grouped: Record<ExternalRefType, IssueExternalRef[]> = {
    branch: [],
    mr: [],
    commit: [],
  };
  for (const r of refs) {
    if (r.source !== "gitlab") continue;
    grouped[r.ref_type]?.push(r);
  }

  async function handleDelete(refId: number) {
    try {
      await remove.mutateAsync(refId);
      toast.success("Reference removed");
    } catch {
      toast.error("Failed to remove reference");
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {canManage && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBranch(true)}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Create branch
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowLink(true)}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link existing
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-muted">Loading…</div>
      ) : refs.length === 0 ? (
        <div className="text-xs text-muted py-6 text-center border border-dashed border-border rounded-lg">
          No GitLab references yet. Push commits or open MRs that mention{" "}
          <code className="px-1 py-0.5 bg-surface-2 rounded text-foreground">
            {issue.key ?? "PROJ-NN"}
          </code>{" "}
          to auto-link, or use the buttons above.
        </div>
      ) : (
        (["mr", "branch", "commit"] as ExternalRefType[]).map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;
          const Meta = TYPE_META[type];
          const Icon = Meta.icon;
          return (
            <div key={type}>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted mb-1.5">
                <Icon className="w-3 h-3" />
                {Meta.label}
                <span className="text-muted">({items.length})</span>
              </div>
              <ul className="space-y-1">
                {items.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-2 transition group"
                  >
                    {type === "mr" && r.state && (
                      <span
                        className={
                          "inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-sm border " +
                          (STATE_BADGE[r.state] ??
                            "bg-surface-2 text-muted border-border")
                        }
                      >
                        {r.state}
                      </span>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 text-xs text-foreground truncate hover:text-brand"
                      title={r.title || r.external_id}
                    >
                      {type === "mr" ? `!${r.external_id} — ` : ""}
                      {type === "commit"
                        ? r.external_id.slice(0, 8) +
                          (r.title ? " · " + r.title : "")
                        : r.title || r.external_id}
                    </a>
                    {r.author_name && (
                      <span className="text-[10px] text-muted shrink-0 hidden sm:inline">
                        {r.author_name}
                      </span>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-foreground"
                      title="Open in GitLab"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                        title="Unlink"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      {showLink && (
        <LinkExternalRefModal
          issue={issue}
          onClose={() => setShowLink(false)}
        />
      )}
      {showBranch && (
        <CreateBranchModal
          issue={issue}
          onClose={() => setShowBranch(false)}
        />
      )}
    </div>
  );
}
