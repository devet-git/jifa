"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  KeyRound,
  Lock,
  Palette,
  Puzzle,
  User,
} from "lucide-react";

const TABS = [
  { id: "account", label: "Account", icon: "user" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "tokens", label: "API Tokens", icon: "key" },
  { id: "integrations", label: "Integrations", icon: "puzzle" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "appearance", label: "Appearance", icon: "palette" },
] as const;

const tabIcons: Record<string, React.ReactNode> = {
  user: <User className="w-4 h-4" />,
  lock: <Lock className="w-4 h-4" />,
  key: <KeyRound className="w-4 h-4" />,
  puzzle: <Puzzle className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
};

export default function PreferencesTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop() ?? "account";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 bg-background pt-3 pb-0 px-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Preferences</h1>
        </div>

        <div className="flex gap-0.5 mb-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/preferences/${t.id}`}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 whitespace-nowrap border-b-2 transition ${
                  active
                    ? "border-brand text-foreground font-medium"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tabIcons[t.icon]}
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-8 pb-8">{children}</div>
    </div>
  );
}
