"use client";

import { use } from "react";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="h-full p-8 overflow-auto text-muted-foreground">
      Select a board to view.
    </div>
  );
}
