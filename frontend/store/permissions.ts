import { create } from "zustand";

interface PermissionsState {
  projectId: number | null;
  perms: Set<string>;
  setPerms: (projectId: number, keys: string[]) => void;
  clear: () => void;
  can: (key: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  projectId: null,
  perms: new Set(),
  setPerms: (projectId, keys) => set({ projectId, perms: new Set(keys) }),
  clear: () => set({ projectId: null, perms: new Set() }),
  can: (key) => get().perms.has(key),
}));
