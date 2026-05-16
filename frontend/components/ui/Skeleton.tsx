import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`surface-card p-4 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`surface-card p-4 flex items-center gap-4 ${className}`}>
      <Skeleton className="h-4 w-4 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonTable({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/**
 * Kanban-shaped placeholder: N columns, each with a header (title + count
 * pill) and stacked card placeholders. Card heights are derived from index
 * so loading reads as a real board without hydration mismatch.
 */
export function SkeletonKanban({
  columns = 4,
  cardsPerColumn = 3,
  columnClassName = "",
}: {
  columns?: number;
  cardsPerColumn?: number;
  columnClassName?: string;
}) {
  const cardHeights = [88, 104, 76, 96, 112, 80];
  return (
    <div className="flex gap-4 h-full items-start">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 min-w-[240px] rounded-xl bg-surface-2/60 border border-border/60 p-3 space-y-2.5 ${columnClassName}`}
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: cardsPerColumn }).map((_, j) => (
              <div
                key={j}
                className="surface-card p-3 space-y-2"
                style={{ minHeight: cardHeights[(i + j) % cardHeights.length] }}
              >
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-10 rounded" />
                    <Skeleton className="h-3 w-6 rounded" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Wiki article-shaped placeholder. Line widths are fixed (not random) so
 * server and client renders agree.
 */
export function SkeletonArticle({ className = "" }: { className?: string }) {
  const lineWidths = ["92%", "78%", "85%", "60%", "88%", "72%", "55%"];
  return (
    <div className={`space-y-4 ${className}`}>
      <Skeleton className="h-3 w-32 rounded" />
      <Skeleton className="h-8 w-2/3 rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-3 w-40 rounded" />
      </div>
      <div className="space-y-2 pt-3">
        {lineWidths.map((w, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
