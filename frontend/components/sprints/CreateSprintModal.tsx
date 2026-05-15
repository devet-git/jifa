"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCreateSprint } from "@/hooks/useSprints";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number | string;
}

export function CreateSprintModal({ open, onClose, projectId }: Props) {
  const [form, setForm] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
  });
  const { mutateAsync, isPending } = useCreateSprint();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await mutateAsync({
      projectId,
      data: {
        name: form.name,
        goal: form.goal,
        start_date: form.start_date ? `${form.start_date}T00:00:00Z` : undefined,
        end_date: form.end_date ? `${form.end_date}T00:00:00Z` : undefined,
      },
    });
    setForm({ name: "", goal: "", start_date: "", end_date: "" });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New sprint">
      <form onSubmit={handleSubmit} className="-m-6 flex flex-col max-h-[75vh]">
        <div className="space-y-4 overflow-y-auto p-6 flex-1">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Sprint name
            </label>
            <input
              required
              className="input"
              placeholder="Sprint 1"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted">
              Sprint goal
            </label>
            <input
              className="input"
              placeholder="What is this sprint trying to achieve?"
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                Start date
              </label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted">
                End date
              </label>
              <input
                type="date"
                className="input"
                value={form.end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={isPending}>
            {isPending ? "Creating…" : "Create sprint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
