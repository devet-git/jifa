"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";

interface UserLike {
  id: number | string;
  name: string;
  email?: string;
  avatar?: string;
}

interface UserSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  users: UserLike[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
  disabled?: boolean;
  includeNone?: boolean;
  noneLabel?: string;
  noneValue?: string;
}

export function UserSearchSelect({
  value,
  onValueChange,
  users,
  placeholder = "Select user...",
  emptyMessage = "No users found.",
  className,
  triggerClassName,
  align = "start",
  disabled,
  includeNone = true,
  noneLabel = "Unassigned",
  noneValue = "__none__",
}: UserSearchSelectProps) {
  const options: SearchableOption[] = React.useMemo(() => {
    const items: SearchableOption[] = [];
    if (includeNone) {
      items.push({ value: noneValue, label: noneLabel });
    }
    for (const u of users) {
      items.push({
        value: String(u.id),
        label: u.name,
        sublabel: u.email,
        avatar: <Avatar name={u.name} src={u.avatar} size="sm" />,
      });
    }
    return items;
  }, [users, includeNone, noneLabel, noneValue]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      className={className}
      triggerClassName={triggerClassName}
      align={align}
      disabled={disabled}
    />
  );
}
