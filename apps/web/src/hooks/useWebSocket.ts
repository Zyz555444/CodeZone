// CodeZone · WebSocket 连接管理
//
// 设计：模块级单例 + React Hook 桥接
// - wsClient: 模块级导出，提供 send / subscribe / connected
// - useWebSocket(): React Hook，在 App 根调用，负责连接生命周期 + store 同步
//
// 修复：
// - setOnlineCount 映射：使用 msg.total / msg.teamOnline 分别赋值
// - 指数退避重连：1s→2s→4s→...→max 30s + 随机抖动
// - 4001 认证失败：清除 token + 跳转登录，不再重连
// - 依赖 currentUser?.id（仅身份变化才重连）
// - 单例保护：模块级唯一连接
import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { tokenStore } from "@/lib/api";
import type { WSMessage } from "@/lib/types";

type MessageHandler = (msg: WSMessage) => void;

// ─────────── 模块级状态 ───────────
let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let active = false;
let currentToken: string | null = null;
const handlers = new Set<MessageHandler>();
const stateListeners = new Set<(connected: boolean) => void>();

function notifyState(connected: boolean): void {
  stateListeners.forEach((fn) => fn(connected));
}

function connect(token: string): void {
  if (!active || !token) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  currentToken = token;
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${location.host}/ws?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    reconnectAttempt = 0;
    notifyState(true);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WSMessage;
      handlers.forEach((h) => {
        try {
          h(msg);
        } catch {
          // 单个 handler 异常不影响其他
        }
      });
    } catch {
      // 忽略解析错误
    }
  };

  ws.onclose = (event) => {
    ws = null;
    notifyState(false);

    // 4001 = 认证失败，清除 token 并跳转登录，不再重连
    if (event.code === 4001) {
      tokenStore.clear();
      if (location.pathname !== "/login") {
        location.href = "/login";
      }
      return;
    }

    // 指数退避重连
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose 会处理重连
    ws?.close();
  };
}

function scheduleReconnect(): void {
  if (!active || !currentToken) return;
  const baseDelay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
  const jitter = Math.random() * 500;
  const delay = baseDelay + jitter;
  reconnectAttempt++;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => connect(currentToken!), delay);
}

function disconnect(): void {
  active = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  reconnectAttempt = 0;
  currentToken = null;
  notifyState(false);
}

// ─────────── 模块级导出：供协作编辑器等组件使用 ───────────
export const wsClient = {
  /** 发送 WS 消息（若未连接则静默丢弃） */
  send(msg: WSMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  },

  /** 订阅收到的 WS 消息，返回取消订阅函数 */
  subscribe(handler: MessageHandler): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  },

  /** 订阅连接状态变化 */
  onStateChange(fn: (connected: boolean) => void): () => void {
    stateListeners.add(fn);
    fn(ws?.readyState === WebSocket.OPEN);
    return () => {
      stateListeners.delete(fn);
    };
  },

  /** 当前是否已连接 */
  get connected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  },
};

// ─────────── React Hook：在 App 根调用 ───────────
export function useWebSocket() {
  const { setOnlineCount, setWsConnected, currentUser, initialized } = useAppStore();
  const userId = currentUser?.id;

  useEffect(() => {
    if (!initialized || !userId) return;

    active = true;

    // 订阅连接状态 → store (在 effect cleanup 中正确移除,避免泄漏)
    const onState = (connected: boolean) => setWsConnected(connected);
    stateListeners.add(onState);
    // 立即同步当前状态
    onState(ws?.readyState === WebSocket.OPEN);

    // 订阅在线人数消息 → store
    const unsubMsg = wsClient.subscribe((msg) => {
      if (msg.type === "online_count") {
        setOnlineCount(msg.total, msg.teamOnline);
      }
    });

    // 建立连接
    const token = tokenStore.get();
    if (token) {
      connect(token);
    }

    // 页面可见性恢复时立即重连
    const onVisibility = () => {
      if (document.visibilityState === "visible" && active && currentToken) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reconnectAttempt = 0;
          connect(currentToken);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsubMsg();
      stateListeners.delete(onState);
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, userId]);
}
