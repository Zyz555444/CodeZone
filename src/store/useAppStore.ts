// CodeZone · 全局状态 (Zustand)
import { create } from "zustand";
import type { User } from "@/lib/types";

interface AppState {
  currentUser: User;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: {
    id: "u1",
    name: "林知白",
    email: "lin@codezone.dev",
    avatar: "",
    role: "admin",
    createdAt: Date.now(),
  },
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
