"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { FormField } from "@/components/ui/FormField";
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Sprint name" required>
          <input
            required
            className="input"
            placeholder="Sprint 1"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Sprint goal">
          <input
            className="input"
            placeholder="What is this sprint trying to achieve?"
            value={form.goal}
            onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start date">
            <DatePicker
              value={form.start_date}
              onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
            />
          </FormField>
          <FormField label="End date">
            <DatePicker
              value={form.end_date}
              onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
            />
          </FormField>
        </div>
        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? "Creating…" : "Create sprint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
