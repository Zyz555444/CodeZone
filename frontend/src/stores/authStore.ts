import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  inviteCode?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasTeam: boolean;
  teams: Team[];
  login: (user: User, token: string) => void;
  logout: () => void;
  setTeamStatus: (hasTeam: boolean, teams: Team[]) => void;
}

const isBrowser = typeof window !== 'undefined';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasTeam: false,
      teams: [],
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, hasTeam: false, teams: [] }),
      setTeamStatus: (hasTeam, teams) => set({ hasTeam, teams }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        if (isBrowser) return sessionStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
