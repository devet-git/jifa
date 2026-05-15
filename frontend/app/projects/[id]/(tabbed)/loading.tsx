import { Skeleton } from "@/components/ui/Skeleton";

export default function ProjectTabLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-4 pb-0 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-5 w-12 rounded-md" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <div className="flex gap-0.5 -mb-px overflow-x-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 mx-3" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
