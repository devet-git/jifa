"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useSprints, useSprintAction } from "@/hooks/useSprints";
import { CreateSprintModal } from "@/components/sprints/CreateSprintModal";
import { SprintRetroModal } from "@/components/sprints/SprintRetroModal";
import { usePermissionsStore } from "@/store/permissions";
import { Plus } from "lucide-react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState, defaultIcons } from "@/components/ui/EmptyState";

export default function SprintsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const can = usePermissionsStore((s) => s.can);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [retroSprintId, setRetroSprintId] = useState<number | null>(null);

  const { data: sprints = [], isLoading } = useSprints(id);
  const sprintAction = useSprintAction();

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Sprints</h2>
        <PermissionGate perm="sprint.create" message="You don't have permission to create sprints">
          <Button size="sm" variant="gradient" onClick={() => setShowCreateSprint(true)} disabled={!can("sprint.create")}>
            <Plus className="w-3.5 h-3.5" />
            New sprint
          </Button>
        </PermissionGate>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sprints.length === 0 ? (
          <EmptyState
            icon={defaultIcons.sprint}
            title="No sprints yet"
            description="Sprints help you organize work into time-boxed iterations. Create your first sprint to get started."
            action={
              <PermissionGate perm="sprint.create">
                <Button size="sm" variant="gradient" onClick={() => setShowCreateSprint(true)} disabled={!can("sprint.create")}>
                  <Plus className="w-3.5 h-3.5" />
                  Create sprint
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          sprints.map((sprint) => (
            <div key={sprint.id} className="surface-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{sprint.name}</span>
                  <Badge type="sprint" value={sprint.status} />
                </div>
                {sprint.goal && <p className="text-sm text-muted truncate">{sprint.goal}</p>}
                <p className="text-xs text-muted mt-1">
                  {sprint.issues?.length ?? 0} issues
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {sprint.status === "planned" && (
                  <PermissionGate perm="sprint.manage" message="You don't have permission to manage sprints">
                    <Button
                      size="sm"
                      onClick={() => sprintAction.mutate({ projectId: id, sprintId: sprint.id, action: "start" })}
                      disabled={!can("sprint.manage")}
                    >
                      Start
                    </Button>
                  </PermissionGate>
                )}
                {sprint.status === "active" && (
                  <>
                    <Link href={`/board/${sprint.id}`}>
                      <Button size="sm" variant="secondary">Open Board</Button>
                    </Link>
                    <PermissionGate perm="sprint.manage" message="You don't have permission to manage sprints">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => sprintAction.mutate({ projectId: id, sprintId: sprint.id, action: "complete" })}
                        disabled={!can("sprint.manage")}
                      >
                        Complete
                      </Button>
                    </PermissionGate>
                  </>
                )}
                {sprint.status === "completed" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRetroSprintId(sprint.id)}
                  >
                    Retrospective
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <CreateSprintModal
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        projectId={id}
      />
      <SprintRetroModal
        open={retroSprintId !== null}
        onClose={() => setRetroSprintId(null)}
        sprintId={retroSprintId}
      />
    </div>
  );
}
