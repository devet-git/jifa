import { AppLayout } from "@/components/layout/AppLayout";

export default function KanbanBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
