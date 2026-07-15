// CodeZone · 全局状态 (Zustand)
import { create } from "zustand";
import type { User, Team, TeamRole } from "@/lib/types";
import { api, tokenStore } from "@/lib/api";

interface AppState {
  currentUser: User | null;
  initialized: boolean;
  sidebarCollapsed: boolean;
  team: Team | null;
  teamRole: TeamRole | null;
  onlineCount: number;
  teamOnlineCount: number;
  wsConnected: boolean;
  initUser: () => Promise<void>;
  setCurrentUser: (u: User | null) => void;
  setTeam: (t: Team | null, role?: TeamRole | null) => void;
  setOnlineCount: (total: number, teamOnline: number) => void;
  setWsConnected: (connected: boolean) => void;
  logout: () => Promise<void>;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  initialized: false,
  sidebarCollapsed: false,
  team: null,
  teamRole: null,
  onlineCount: 0,
  teamOnlineCount: 0,
  wsConnected: false,
  initUser: async () => {
    const token = tokenStore.get();
    if (!token) {
      set({ currentUser: null, team: null, teamRole: null, initialized: true });
      return;
    }
    try {
      const data = await api.me();
      set({
        currentUser: data as User,
        team: (data as any).team ?? null,
        teamRole: (data as any).teamRole ?? null,
        initialized: true,
      });
    } catch {
      tokenStore.clear();
      set({ currentUser: null, team: null, teamRole: null, initialized: true });
    }
  },
  setCurrentUser: (u) => set({ currentUser: u }),
  setTeam: (t, role) => set({ team: t, teamRole: role ?? null }),
  setOnlineCount: (total, teamOnline) => set({ onlineCount: total, teamOnlineCount: teamOnline }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  logout: async () => {
    await api.logout();
    set({ currentUser: null, team: null, teamRole: null, onlineCount: 0, teamOnlineCount: 0, wsConnected: false });
  },
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
