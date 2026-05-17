"use client";

import { useState } from "react";
import { useCreateExternalRef } from "@/hooks/useGitLab";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "sonner";
import type { Issue, ExternalRefType } from "@/types";

interface Props {
  issue: Issue;
  onClose: () => void;
}

export function LinkExternalRefModal({ issue, onClose }: Props) {
  const create = useCreateExternalRef(issue.id);
  const [refType, setRefType] = useState<ExternalRefType>("mr");
  const [url, setUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      await create.mutateAsync({ ref_type: refType, url: url.trim() });
      toast.success("Reference linked");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Failed to link reference");
    }
  }

  return (
    <Modal open onClose={onClose} title="Link GitLab reference" size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Reference type</label>
          <Select
            value={refType}
            onValueChange={(v) => setRefType(v as ExternalRefType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mr">Merge request</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
              <SelectItem value="commit">Commit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">GitLab URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://gitlab.com/group/repo/-/merge_requests/123"
            className="w-full text-sm px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <p className="text-[11px] text-muted mt-1">
            Must point to the same repo configured on this project.
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
            Link
          </Button>
        </div>
      </form>
    </Modal>
  );
}
