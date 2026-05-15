import { Skeleton } from "@/components/ui/Skeleton";

export default function PreferencesLoading() {
  return (
    <div className="max-w-4xl mx-auto pt-8 px-8 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-3 w-64" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
