"use client";

import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/Switch";
import { Bell } from "lucide-react";
import type { NotificationPrefs } from "@/types";

type Row = {
  label: string;
  description: string;
  inApp: keyof NotificationPrefs;
  email: keyof NotificationPrefs;
};

const ROWS: Row[] = [
  {
    label: "Comments",
    description: "Someone comments on an issue you are watching.",
    inApp: "in_app_comment",
    email: "email_comment",
  },
  {
    label: "Mentions",
    description: "Someone @-mentions you in a comment.",
    inApp: "in_app_mention",
    email: "email_mention",
  },
  {
    label: "Assigned to you",
    description: "An issue is assigned to you.",
    inApp: "in_app_assigned",
    email: "email_assigned",
  },
  {
    label: "Status changes",
    description: "An issue you are watching changes status.",
    inApp: "in_app_status_change",
    email: "email_status_change",
  },
  {
    label: "Issue links",
    description: "Someone adds a blocks / relates / duplicates link.",
    inApp: "in_app_link_added",
    email: "email_link_added",
  },
];

export default function NotificationsPage() {
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    update.mutate({ [key]: value } as Partial<NotificationPrefs>);
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted">Choose how and when you receive updates</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-4 border-b border-border items-center">
        <div>
          <p className="font-medium text-sm">Daily digest email</p>
          <p className="text-xs text-muted mt-0.5">Receive one summary email per day instead of individual notifications.</p>
        </div>
        <div />
        <div className="flex justify-center">
          <Switch checked={Boolean(prefs?.email_digest)} onCheckedChange={(v) => setPref("email_digest", v)} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-3 border-b border-border bg-surface-2/60 text-[11px] uppercase tracking-wider font-medium text-muted">
        <span>Event</span>
        <span className="text-center">In-app</span>
        <span className="text-center">Email</span>
      </div>
      {ROWS.map((row) => (
        <div key={row.label} className="grid grid-cols-[1fr_80px_80px] gap-4 px-6 py-4 border-b border-border items-center last:border-b-0 hover:bg-surface-2/30 transition">
          <div>
            <p className="font-medium text-sm">{row.label}</p>
            <p className="text-xs text-muted mt-0.5">{row.description}</p>
          </div>
          <div className="flex justify-center"><Switch checked={Boolean(prefs?.[row.inApp])} onCheckedChange={(v) => setPref(row.inApp, v)} /></div>
          <div className="flex justify-center"><Switch checked={Boolean(prefs?.[row.email])} onCheckedChange={(v) => setPref(row.email, v)} /></div>
        </div>
      ))}
    </div>
  );
}
