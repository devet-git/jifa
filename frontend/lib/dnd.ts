// Shared drag-and-drop utilities. The drag handlers in each page keep a local
// mirror of the list/columns while a drag is in progress (so the UI rearranges
// instantly, without round-tripping through React Query), and only commit to
// the server on drop. These helpers do the index math so every page agrees on
// the same "where will this card land" logic.

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Midpoint between neighbors; falls back to ±1 at an edge, or 0 in an empty
// list. The server is authoritative — mutation `onSettled` invalidates queries
// so any rank gap or rebalance is reflected on the next refetch.
export function computeMidRank(before?: number, after?: number): number {
  if (before != null && after != null) return (before + after) / 2;
  if (before != null) return before + 1;
  if (after != null) return after - 1;
  return 0;
}

export interface ReorderPlan<T> {
  fromIndex: number;
  toIndex: number; // final index AFTER the move (in the original-length list)
  before?: T;
  after?: T;
  sameSlot: boolean;
}

// Plan a direction-aware reorder inside a single list. `target` tells us where
// the user is dropping: on another card (`{ kind: "card", overId }`) or onto
// an empty/append slot (`{ kind: "append" }`).
//
// Direction matters when dropping on another card: dragging top→down past a
// target inserts AFTER it; bottom→up inserts BEFORE it. Without this, top→down
// drops collapse back onto the original slot.
export function planReorder<T extends { id: number; rank?: number }>(
  list: T[],
  draggedId: number,
  target: { kind: "card"; overId: number } | { kind: "append" },
): ReorderPlan<T> | null {
  const fromIndex = list.findIndex((i) => i.id === draggedId);
  if (fromIndex === -1) return null;

  if (target.kind === "append") {
    const toIndex = list.length - 1;
    if (fromIndex === toIndex) {
      return { fromIndex, toIndex, sameSlot: true };
    }
    const filtered = list.filter((i) => i.id !== draggedId);
    const before = filtered[filtered.length - 1];
    return { fromIndex, toIndex, before, after: undefined, sameSlot: false };
  }

  const targetIndex = list.findIndex((i) => i.id === target.overId);
  if (targetIndex === -1 || fromIndex === targetIndex) {
    return { fromIndex, toIndex: targetIndex, sameSlot: true };
  }
  const filtered = list.filter((i) => i.id !== draggedId);
  const targetInFiltered = filtered.findIndex((i) => i.id === target.overId);
  const insertIdx =
    fromIndex < targetIndex ? targetInFiltered + 1 : targetInFiltered;
  const before = insertIdx > 0 ? filtered[insertIdx - 1] : undefined;
  const after = insertIdx < filtered.length ? filtered[insertIdx] : undefined;
  return {
    fromIndex,
    toIndex: fromIndex < targetIndex ? targetIndex : targetIndex,
    before,
    after,
    sameSlot: false,
  };
}
