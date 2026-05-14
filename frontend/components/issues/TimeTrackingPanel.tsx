"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWorklog,
  useAddWorklog,
  useDeleteWorklog,
  parseDuration,
  formatDuration,
} from "@/hooks/useWorklog";
import { Avatar } from "@/components/ui/Avatar";
import type { Issue } from "@/types";

interface Props {
  issue: Issue;
}

export function TimeTrackingPanel({ issue }: Props) {
  const qc = useQueryClient();
  const { data: logs = [] } = useWorklog(issue.id);
  const add = useAddWorklog(issue.id);
  const remove = useDeleteWorklog(issue.id);

  const [duration, setDuration] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState("");

  const spent = issue.time_spent ?? 0;
  const estimate = issue.original_estimate ?? 0;
  const remaining = estimate > 0 ? Math.max(0, estimate - spent) : 0;
  const pct = estimate > 0 ? Math.min(100, (spent / estimate) * 100) : 0;
  const overrun = estimate > 0 && spent > estimate;

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const minutes = parseDuration(duration);
    if (!minutes) {
      setError(`Couldn't parse "${duration}". Try "1h 30m" or "45m".`);
      return;
    }
    await add.mutateAsync({
      minutes,
      description: desc || undefined,
    });
    setDuration("");
    setDesc("");
  }

  async function saveEstimate() {
    const minutes = parseDuration(estimateDraft);
    if (minutes == null) {
      setError(`Couldn't parse "${estimateDraft}".`);
      return;
    }
    await api.put(`/issues/${issue.id}`, { original_estimate: minutes });
    qc.invalidateQueries({ queryKey: ["issues", issue.id] });
    qc.invalidateQueries({ queryKey: ["issues"] });
    setShowEstimate(false);
    setEstimateDraft("");
  }

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
        Time tracking
      </p>

      <div className="bg-white border rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">
            Logged{" "}
            <span className="font-semibold text-gray-800">
              {formatDuration(spent)}
            </span>
          </span>
          <span className="text-gray-500">
            Estimate{" "}
            {showEstimate ? (
              <span className="inline-flex items-center gap-1">
                <input
                  autoFocus
                  className="border rounded px-1 py-0.5 text-xs w-20"
                  placeholder="2h 30m"
                  value={estimateDraft}
                  onChange={(e) => setEstimateDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEstimate();
                    if (e.key === "Escape") setShowEstimate(false);
                  }}
                />
                <button
                  onClick={saveEstimate}
                  className="text-blue-600 hover:underline"
                >
                  ok
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setEstimateDraft(estimate ? formatDuration(estimate) : "");
                  setShowEstimate(true);
                }}
                className="font-semibold text-gray-800 hover:underline"
              >
                {estimate ? formatDuration(estimate) : "set"}
              </button>
            )}
          </span>
          {estimate > 0 && (
            <span
              className={`${
                overrun ? "text-red-600 font-semibold" : "text-gray-500"
              }`}
            >
              Remaining{" "}
              <span className="font-semibold">
                {overrun
                  ? `over by ${formatDuration(spent - estimate)}`
                  : formatDuration(remaining)}
              </span>
            </span>
          )}
        </div>
        {estimate > 0 && (
          <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
            <div
              className={`h-full ${overrun ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleLog} className="flex gap-2 mb-2">
        <input
          placeholder="1h 30m"
          className="border rounded px-2 py-1 text-sm w-24"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <input
          placeholder="What did you work on?"
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          type="submit"
          disabled={!duration || add.isPending}
          className="text-xs bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50"
        >
          Log
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {logs.length > 0 && (
        <ul className="space-y-1">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-2 text-sm border rounded px-2 py-1"
            >
              <Avatar name={l.user?.name} size="sm" />
              <span className="font-semibold">{formatDuration(l.minutes)}</span>
              <span className="text-gray-500 flex-1 truncate">
                {l.description || <em className="text-gray-400">—</em>}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(l.started_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => remove.mutate(l.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
