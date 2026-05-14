import { AppLayout } from "@/components/layout/AppLayout";

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
