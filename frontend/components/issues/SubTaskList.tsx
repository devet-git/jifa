"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Issue } from "@/types";

interface Props {
  issue: Issue;
}

export function SubTaskList({ issue }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const qc = useQueryClient();

  // Only real subtasks live here. Non-epic children with type≠subtask are
  // story/task siblings — they show under the Epic in the Roadmap or Epics
  // view, not the parent task's sub-task list.
  const subTasks = (issue.sub_issues ?? []).filter((s) => s.type === "subtask");
  const done = subTasks.filter((s) => s.status === "done").length;

  // Epics can't have sub-tasks directly (sub-tasks attach to a story/task/bug).
  // Hide the entire panel on epics — the Epics page covers their children.
  if (issue.type === "epic") return null;

  async function createSubTask() {
    if (!title.trim()) return;
    await api.post("/issues", {
      title,
      type: "subtask",
      status: "todo",
      priority: "medium",
      project_id: issue.project_id,
      parent_id: issue.id,
    });
    setTitle("");
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["issues", issue.id] });
  }

  async function toggleSubTask(sub: Issue) {
    const newStatus = sub.status === "done" ? "todo" : "done";
    await api.put(`/issues/${sub.id}/status`, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["issues", issue.id] });
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Sub-tasks{subTasks.length > 0 && ` (${done}/${subTasks.length})`}
        </p>
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-blue-500 hover:underline"
        >
          + Add sub-task
        </button>
      </div>

      {subTasks.length > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${(done / subTasks.length) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subTasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50">
            <input
              type="checkbox"
              checked={sub.status === "done"}
              onChange={() => toggleSubTask(sub)}
              className="rounded"
            />
            <span className={`text-sm flex-1 ${sub.status === "done" ? "line-through text-gray-400" : ""}`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createSubTask();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Sub-task title..."
            className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createSubTask}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
