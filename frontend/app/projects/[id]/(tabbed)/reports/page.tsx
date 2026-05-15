"use client";

import { use, useMemo, useState } from "react";
import { useSprints } from "@/hooks/useSprints";
import {
  useVelocity,
  useBurndown,
  useCycleTime,
  useWorkload,
  useCFD,
  useTimeInStatus,
  useControlChart,
} from "@/hooks/useReports";
import { VelocityChart } from "@/components/reports/VelocityChart";
import { BurndownChart } from "@/components/reports/BurndownChart";
import { CycleTimeChart } from "@/components/reports/CycleTimeChart";
import { WorkloadChart } from "@/components/reports/WorkloadChart";
import { CFDChart } from "@/components/reports/CFDChart";
import { TimeInStatusChart } from "@/components/reports/TimeInStatusChart";
import { ControlChart } from "@/components/reports/ControlChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: sprints = [] } = useSprints(id);
  const { data: velocity = [] } = useVelocity(id);

  const burndownCandidates = useMemo(
    () => sprints.filter((s) => s.status === "active" || s.status === "completed"),
    [sprints],
  );
  const activeSprint = sprints.find((s) => s.status === "active");
  const [selectedSprint, setSelectedSprint] = useState<number | undefined>(
    activeSprint?.id ?? burndownCandidates[0]?.id,
  );
  const { data: burndown = [] } = useBurndown(id, selectedSprint);
  const { data: cycle = [] } = useCycleTime(id);
  const { data: workload = [] } = useWorkload(id);
  const { data: cfd = [] } = useCFD(id);
  const { data: timeInStatus = [] } = useTimeInStatus(id);
  const { data: controlChart = [] } = useControlChart(id);

  // If a sprint is selected from sprints data only after first render,
  // honour it so charts populate.
  const effectiveSprintId = selectedSprint ?? activeSprint?.id ?? burndownCandidates[0]?.id;

  return (
    <div className="h-full p-8 overflow-auto space-y-6 max-w-5xl mx-auto w-full">
        <section className="surface-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Velocity</h2>
              <p className="text-xs text-muted mt-0.5">
                Committed vs completed points across recent sprints.
              </p>
            </div>
          </div>
          <VelocityChart data={velocity} />
        </section>

        <section className="surface-card p-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold">Burndown</h2>
              <p className="text-xs text-muted mt-0.5">
                Remaining story points per day against the ideal line.
              </p>
            </div>
            <Select
              value={effectiveSprintId ? String(effectiveSprintId) : undefined}
              onValueChange={(v) => setSelectedSprint(v ? Number(v) : undefined)}
            >
              <SelectTrigger className="!py-1.5 !text-xs !w-auto min-w-[180px]">
                <SelectValue placeholder="— Select sprint —" />
              </SelectTrigger>
              <SelectContent>
                {burndownCandidates.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {effectiveSprintId ? (
            <BurndownChart data={burndown} />
          ) : (
            <p className="text-sm text-muted text-center py-10 italic">
              No active or completed sprints to show.
            </p>
          )}
        </section>

        <section className="surface-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Workload</h2>
            <p className="text-xs text-muted mt-0.5">
              Open and in-progress issues per assignee.
            </p>
          </div>
          <WorkloadChart data={workload} />
        </section>

        <section className="surface-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Cycle time</h2>
            <p className="text-xs text-muted mt-0.5">
              Hours from first <em>in progress</em> transition to{" "}
              <em>done</em>, for issues completed in the last 90 days.
            </p>
          </div>
          <CycleTimeChart data={cycle} />
        </section>

        <section className="surface-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Cumulative Flow Diagram</h2>
            <p className="text-xs text-muted mt-0.5">
              Daily issue count per status over the last 30 days.
            </p>
          </div>
          <CFDChart data={cfd} />
        </section>

        <section className="surface-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Time in Status</h2>
            <p className="text-xs text-muted mt-0.5">
              Average time issues spend in each status (last 90 days).
            </p>
          </div>
          <TimeInStatusChart data={timeInStatus} />
        </section>

        <section className="surface-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Control Chart</h2>
            <p className="text-xs text-muted mt-0.5">
              Cycle time variation per issue — spots outliers and process instability.
            </p>
          </div>
          <ControlChart data={controlChart} />
        </section>
      </div>
  );
}
