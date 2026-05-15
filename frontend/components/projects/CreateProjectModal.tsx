"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
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
        <FormField label="Project name" required>
          <input
            required
            className="input"
            placeholder="My awesome project"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField
          label={
            <>
              Key{" "}
              <span className="text-muted/70 font-normal">
                (max 6 characters)
              </span>
            </>
          }
          required
          description={
            <>
              Used in issue keys, e.g.{" "}
              <span className="font-mono">{form.key || "MAP"}-123</span>
            </>
          }
        >
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
        </FormField>
        <FormField label="Description">
          <textarea
            rows={3}
            className="input resize-none"
            placeholder="Optional — a short description of the project"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </FormField>
        <div className="flex justify-end gap-2 pt-2 border-t border-border -mx-6 px-6 -mb-6 pb-6 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
