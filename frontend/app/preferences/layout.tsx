import { AppLayout } from "@/components/layout/AppLayout";

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
