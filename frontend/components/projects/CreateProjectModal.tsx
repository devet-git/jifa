"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCreateProject } from "@/hooks/useProject";

interface Props {
  open: boolean;
  onClose: () => void;
}

function generateKey(name: string) {
  return (
    name
      .split(" ")
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 6) || "PRJ"
  );
}

export function CreateProjectModal({ open, onClose }: Props) {
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const { mutateAsync, isPending } = useCreateProject();

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, key: generateKey(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync(form);
    setForm({ name: "", key: "", description: "" });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Project name
          </label>
          <input
            required
            className="input"
            placeholder="My awesome project"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Key{" "}
            <span className="text-muted/70 font-normal">(max 6 characters)</span>
          </label>
          <div className="relative">
            <input
              required
              maxLength={6}
              className="input uppercase font-mono tracking-wider"
              placeholder="MAP"
              value={form.key}
              onChange={(e) =>
                setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))
              }
            />
          </div>
          <p className="text-[11px] text-muted mt-1">
            Used in issue keys, e.g.{" "}
            <span className="font-mono">{form.key || "MAP"}-123</span>
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted">
            Description
          </label>
          <textarea
            rows={3}
            className="input resize-none"
            placeholder="Optional — a short description of the project"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border -mx-6 px-6 -mb-6 pb-6 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={isPending}>
            {isPending ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
