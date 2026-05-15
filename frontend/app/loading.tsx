import { Spinner } from "@/components/ui/Spinner";

export default function RootLoading() {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <Spinner className="w-8 h-8 text-muted" />
    </div>
  );
}
