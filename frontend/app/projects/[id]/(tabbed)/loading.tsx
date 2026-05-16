import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Fallback while a tab page mounts. The surrounding layout already renders
 * the project header (with its own skeleton) and tab bar from the URL, so
 * this only fills the body area. Avoid duplicating header/tab skeletons
 * here — that caused a brief flash where the layout's real header+tabs
 * were briefly overlaid by skeleton copies of themselves.
 */
export default function ProjectTabLoading() {
  return (
    <div className="h-full p-8 space-y-3">
      <Skeleton className="h-5 w-48 rounded" />
      <Skeleton className="h-3 w-72 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="surface-card p-4 space-y-2"
            style={{ minHeight: 96 + (i % 3) * 16 }}
          >
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
