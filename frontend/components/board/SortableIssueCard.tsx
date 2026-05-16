import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IssueCard } from "@/components/issues/IssueCard";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Issue } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  issue: Issue;
  onClick: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}

export function SortableIssueCard({ issue, onClick, selectMode, selected, onToggleSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });

  // When this card is being dragged, the actual visual is rendered inside
  // <DragOverlay/>. Suppress transform/transition on the source node so it
  // doesn't try to translate itself (which would otherwise drift the empty
  // placeholder slot away from where the user grabbed).
  const style = isDragging
    ? { opacity: 0 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  if (selectMode) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn("flex items-start gap-2 cursor-pointer", isDragging && "opacity-0")}
        onClick={() => onToggleSelect?.(issue.id)}
      >
        <Checkbox
          checked={!!selected}
          onCheckedChange={() => onToggleSelect?.(issue.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 shrink-0"
        />
        <div className="flex-1 pointer-events-none">
          <IssueCard issue={issue} onClick={() => {}} dragging={false} />
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? "opacity-0" : ""}>
      <IssueCard issue={issue} onClick={onClick} dragging={isDragging} draggable />
    </div>
  );
}
