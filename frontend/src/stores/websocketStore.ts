import { create } from 'zustand';

interface WebSocketState {
  isConnected: boolean;
  onlineCount: number;
  setConnected: (connected: boolean) => void;
  setOnlineCount: (count: number) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  onlineCount: 0,
  setConnected: (connected) => set({ isConnected: connected }),
  setOnlineCount: (count) => set({ onlineCount: count }),
}));
