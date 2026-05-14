import { AppLayout } from "@/components/layout/AppLayout";

export default function MyIssuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
