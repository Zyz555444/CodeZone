// CodeZone · 全局状态 (Zustand)
import { create } from "zustand";
import type { User } from "@/lib/types";
import { api, tokenStore } from "@/lib/api";

interface AppState {
  currentUser: User | null;
  initialized: boolean;
  sidebarCollapsed: boolean;
  initUser: () => Promise<void>;
  setCurrentUser: (u: User | null) => void;
  logout: () => Promise<void>;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  initialized: false,
  sidebarCollapsed: false,
  initUser: async () => {
    const token = tokenStore.get();
    if (!token) {
      set({ currentUser: null, initialized: true });
      return;
    }
    try {
      const user = await api.me();
      set({ currentUser: user, initialized: true });
    } catch {
      tokenStore.clear();
      set({ currentUser: null, initialized: true });
    }
  },
  setCurrentUser: (u) => set({ currentUser: u }),
  logout: async () => {
    await api.logout();
    set({ currentUser: null });
  },
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
