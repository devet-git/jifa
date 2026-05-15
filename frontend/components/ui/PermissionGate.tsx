"use client";

import { usePermissionsStore } from "@/store/permissions";
import { Tooltip } from "@/components/ui/Tooltip";

interface Props {
  perm: string;
  children: React.ReactNode;
  showDisabled?: boolean;
  fallback?: React.ReactNode;
  message?: string;
}

export function PermissionGate({
  perm,
  children,
  showDisabled = true,
  fallback = null,
  message,
}: Props) {
  const can = usePermissionsStore((s) => s.can);

  if (can(perm)) return <>{children}</>;
  if (!showDisabled) return <>{fallback}</>;

  return (
    <Tooltip content={message ?? `Bạn không có quyền "${perm}"`}>
      <span className="inline-flex opacity-40 cursor-not-allowed select-none [&>*]:pointer-events-none">
        {children}
      </span>
    </Tooltip>
  );
}
