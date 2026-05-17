"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe, useUpdateProfile } from "@/hooks/useUsers";
import { showConfirm } from "@/store/confirm";
import { useLogout } from "@/hooks/useLogout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Camera, LogOut, User } from "lucide-react";

export default function AccountPage() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const router = useRouter();
  const logout = useLogout();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile.mutate({ avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  const displayName = name || me?.name || "";

  async function handleSignOut() {
    if (
      !(await showConfirm({
        title: "Sign out?",
        message: "You'll need to enter your credentials again to sign back in.",
        confirmLabel: "Sign out",
        variant: "primary",
      }))
    )
      return;
    logout();
    router.push("/login");
  }

  return (
    <div className="space-y-4">
      {/* Account */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Account</h2>
            <p className="text-xs text-muted">Your profile information and avatar</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => fileRef.current?.click()}
            title="Change avatar"
          >
            <Avatar name={me?.name} src={me?.avatar} size="xl" />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <label className="text-xs text-muted block mb-1">Display name</label>
              <input
                className="input !py-1.5 !text-sm w-56"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  const n = displayName.trim();
                  if (n && n !== me?.name) updateProfile.mutate({ name: n });
                }}
              />
            </div>
            <p className="text-xs text-muted">{me?.email}</p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Sign out</h2>
            <p className="text-xs text-muted">End your session on this device.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-2/60">
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">
              Signed in as{" "}
              <span className="font-medium">{me?.name ?? "—"}</span>
            </p>
            <p className="text-xs text-muted truncate">{me?.email}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
