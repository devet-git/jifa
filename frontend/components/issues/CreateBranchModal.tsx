"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useCreateGitLabBranch,
  useGitLabBranches,
} from "@/hooks/useGitLab";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Issue } from "@/types";

interface Props {
  issue: Issue;
  onClose: () => void;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

const PREFERRED_DEFAULTS = ["main", "master", "develop", "dev"];

export function CreateBranchModal({ issue, onClose }: Props) {
  const create = useCreateGitLabBranch(issue.id);
  const { data: branches = [], isLoading: branchesLoading } =
    useGitLabBranches(issue.id, true);

  const defaultName = useMemo(() => {
    const slug = slugify(issue.title);
    const key = issue.key ?? `ISSUE-${issue.id}`;
    return `feature/${key}${slug ? "-" + slug : ""}`;
  }, [issue.id, issue.key, issue.title]);

  const initialSource = useMemo(() => {
    if (branches.length === 0) return "";
    for (const pref of PREFERRED_DEFAULTS) {
      if (branches.some((b) => b.name === pref)) return pref;
    }
    return branches[0].name;
  }, [branches]);

  const [branchName, setBranchName] = useState(defaultName);
  const [sourceBranch, setSourceBranch] = useState<string>("");

  useEffect(() => {
    if (sourceBranch === "" && initialSource) {
      setSourceBranch(initialSource);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceBranch) {
      toast.error("Select a source branch");
      return;
    }
    try {
      await create.mutateAsync({
        branch_name: branchName.trim(),
        source_branch: sourceBranch.trim(),
      });
      toast.success("Branch created");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Failed to create branch");
    }
  }

  const options = useMemo(
    () =>
      branches.map((b) => ({
        value: b.name,
        label: b.name,
      })),
    [branches],
  );

  return (
    <Modal open onClose={onClose} title="Create GitLab branch" size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Branch name</label>
          <input
            type="text"
            required
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Source branch</label>
          {branchesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted px-3 py-2 border border-border rounded-lg bg-surface">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading branches…
            </div>
          ) : branches.length === 0 ? (
            <input
              type="text"
              required
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              placeholder="main"
              className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          ) : (
            <SearchableSelect
              value={sourceBranch}
              onValueChange={setSourceBranch}
              options={options}
              placeholder="Choose source branch…"
            />
          )}
          <p className="text-[11px] text-muted mt-1">
            New branch will be created from this ref in GitLab.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={create.isPending}
          >
            Create branch
          </Button>
        </div>
      </form>
    </Modal>
  );
}
