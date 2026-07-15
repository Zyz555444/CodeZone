// CodeZone · WebSocket 连接 Hook
// 维护与服务器的持久连接，接收在线人数和用户状态推送
import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { tokenStore } from "@/lib/api";

export function useWebSocket() {
  const { setOnlineCount, setWsConnected, currentUser, initialized } = useAppStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!initialized || !currentUser) return;

    let active = true;

    function connect() {
      const token = tokenStore.get();
      if (!token || !active) return;

      // 确定 WebSocket URL
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${location.host}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "online_count") {
            setOnlineCount(data.count, data.teamId ? data.count : 0);
          }
        } catch {
          // 忽略解析错误
        }
      };

      ws.onclose = () => {
        if (!active) return;
        setWsConnected(false);
        // 5 秒后重连
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // 阻止重连
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [initialized, currentUser, setOnlineCount, setWsConnected]);
}