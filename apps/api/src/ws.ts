/**
 * CodeZone · WebSocket 服务
 *
 * 双职责：
 * 1. 在线用户管理 + 团队广播（在线人数、用户上下线）
 * 2. 协作编辑房间路由（文档操作、光标感知、房间加入/离开）
 *
 * 安全：JWT 认证，按 teamId 过滤广播
 * 健壮：心跳 ping/pong + 超时清理，async try/catch
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "./auth.js";
import { teamMemberRepo, docRepo } from "./repository.js";
import type { WSMessage, Collaborator } from "@codezone/shared";

interface OnlineUser {
  userId: string;
  name: string;
  teamId: string | null;
  ws: WebSocket;
  clientId: number;
}

// 在线用户池: userId → 会话列表（同一用户多端登录）
const onlineUsers = new Map<string, OnlineUser[]>();

// 协作房间: docId → 在线 WebSocket 集合
const rooms = new Map<string, Set<WebSocket>>();

// 全局 clientId 分配器
let clientIdCounter = 1;

let wss: WebSocketServer;

// ─────────── WS 扩展属性 ───────────
interface ExtWS extends WebSocket {
  __alive: boolean;
  __userId?: string;
  __name?: string;
  __teamId?: string | null;
  __clientId?: number;
  __rooms: Set<string>;
}

// ─────────── 心跳清理 ───────────
const HEARTBEAT_INTERVAL = 30000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const ext = client as ExtWS;
      if (ext.__alive === false) {
        ext.terminate();
        return;
      }
      ext.__alive = false;
      ext.ping();
    });
  }, HEARTBEAT_INTERVAL);
}

export function attachWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });
  startHeartbeat();

  wss.on("connection", async (ws, req) => {
    const ext = ws as ExtWS;
    ext.__alive = true;
    ext.__rooms = new Set();

    ws.on("pong", () => {
      ext.__alive = true;
    });

    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close(4001, "未认证");
        return;
      }

      const user = verifyToken(token);
      if (!user) {
        ws.close(4001, "token 无效");
        return;
      }

      const membership = await teamMemberRepo.getByUser(user.id);
      const teamId = membership?.teamId ?? null;
      const clientId = clientIdCounter++;

      ext.__userId = user.id;
      ext.__name = user.name;
      ext.__teamId = teamId;
      ext.__clientId = clientId;

      const online: OnlineUser = { userId: user.id, name: user.name, teamId, ws, clientId };

      // 仅在首次上线时广播 online（多端登录不重复广播）
      const wasOffline = !onlineUsers.has(user.id) || onlineUsers.get(user.id)!.length === 0;
      if (!onlineUsers.has(user.id)) {
        onlineUsers.set(user.id, []);
      }
      onlineUsers.get(user.id)!.push(online);

      sendOnlineCount(teamId);
      if (wasOffline) {
        sendUserStatus(user.id, user.name, teamId, "online");
      }

      // ─────────── 消息处理 ───────────
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WSMessage;
          handleMessage(ws, msg);
        } catch {
          // 忽略无效消息
        }
      });

      ws.on("close", () => {
        // 清理在线用户池
        const sessions = onlineUsers.get(user.id);
        if (sessions) {
          const idx = sessions.indexOf(online);
          if (idx !== -1) sessions.splice(idx, 1);
          if (sessions.length === 0) {
            onlineUsers.delete(user.id);
            // 关键：先暂存 name/teamId 再 delete，此处 user.name/teamId 仍可用（来自闭包）
            sendUserStatus(user.id, user.name, teamId, "offline");
          }
        }
        sendOnlineCount(teamId);

        // 清理房间
        for (const docId of ext.__rooms) {
          leaveRoom(ws, docId);
        }
      });

      ws.on("error", (err) => {
        console.error("[WS] 连接错误:", err.message);
      });
    } catch (err) {
      console.error("[WS] 连接处理异常:", err);
      try {
        ws.close(1011, "服务异常");
      } catch {
        // 忽略
      }
    }
  });
}

// ─────────── 消息分发 ───────────
function handleMessage(ws: WebSocket, msg: WSMessage): void {
  const ext = ws as ExtWS;
  if (!ext.__clientId) return;

  switch (msg.type) {
    case "join_room":
      // 异步处理,需捕获异常避免未处理的 Promise rejection
      joinRoom(ws, msg.docId).catch((err) => {
        console.error("[WS] joinRoom 异常:", err);
      });
      break;
    case "leave_room":
      leaveRoom(ws, msg.docId);
      break;
    case "doc_op":
      // 安全校验:必须已加入该房间才能发送操作
      if (!ext.__rooms.has(msg.docId)) return;
      broadcastToRoom(msg.docId, JSON.stringify(msg), ws);
      break;
    case "awareness":
      if (!ext.__rooms.has(msg.docId)) return;
      broadcastToRoom(msg.docId, JSON.stringify(msg), ws);
      break;
    default:
      // online_count / user_status / presence / room_joined / error 为服务端→客户端消息，忽略客户端发来的
      break;
  }
}

// ─────────── 房间管理 ───────────
async function joinRoom(ws: WebSocket, docId: string): Promise<void> {
  const ext = ws as ExtWS;
  if (!ext.__clientId) return;

  // 无团队时显式返回错误,避免客户端永远等待 room_joined
  if (!ext.__teamId) {
    safeSend(ws, { type: "error", message: "需要加入团队才能协作", code: 403 });
    return;
  }

  // 验证文档存在且用户有权访问
  const doc = await docRepo.getById(docId);
  // 关键:await 期间连接可能已关闭,避免操作已关闭的 ws
  if (ws.readyState !== WebSocket.OPEN) return;
  if (!doc) {
    safeSend(ws, { type: "error", message: "文档不存在", code: 404 });
    return;
  }
  if (ext.__teamId !== doc.teamId) {
    safeSend(ws, { type: "error", message: "无权访问此文档", code: 403 });
    return;
  }

  // 加入房间
  if (!rooms.has(docId)) {
    rooms.set(docId, new Set());
  }
  rooms.get(docId)!.add(ws);
  ext.__rooms.add(docId);

  // 给新加入者发送文档内容 + 当前协作者列表（不含自己）+ 分配的 clientId
  const reply: WSMessage = {
    type: "room_joined",
    docId,
    content: doc.content,
    collaborators: getRoomCollaborators(docId, ext.__clientId),
    clientId: ext.__clientId,
  };
  safeSend(ws, reply);

  // 通知房间内其他人：更新 presence（含新加入者）
  const presence: WSMessage = {
    type: "presence",
    docId,
    collaborators: getRoomCollaborators(docId),
  };
  broadcastToRoom(docId, JSON.stringify(presence), ws);
}

/** 安全发送消息:仅在连接 OPEN 时发送,避免操作已关闭的 ws 抛异常 */
function safeSend(ws: WebSocket, msg: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("[WS] 发送消息异常:", err);
    }
  }
}

function leaveRoom(ws: WebSocket, docId: string): void {
  const ext = ws as ExtWS;
  const room = rooms.get(docId);
  if (!room) {
    ext.__rooms.delete(docId);
    return;
  }
  room.delete(ws);
  ext.__rooms.delete(docId);

  if (room.size === 0) {
    rooms.delete(docId);
  } else {
    // 通知剩余协作者更新 presence
    const presence: WSMessage = {
      type: "presence",
      docId,
      collaborators: getRoomCollaborators(docId),
    };
    broadcastToRoom(docId, JSON.stringify(presence));
  }
}

function getRoomCollaborators(docId: string, excludeClientId?: number): Collaborator[] {
  const room = rooms.get(docId);
  if (!room) return [];
  const collaborators: Collaborator[] = [];
  const seen = new Set<string>();
  for (const client of room) {
    const ext = client as ExtWS;
    if (!ext.__userId || !ext.__name || !ext.__clientId) continue;
    if (excludeClientId === ext.__clientId) continue;
    if (seen.has(ext.__userId)) continue;
    seen.add(ext.__userId);
    collaborators.push({
      id: ext.__clientId,
      name: ext.__name,
      color: collaboratorColor(ext.__clientId),
      avatarInitial: ext.__name.charAt(0),
      isLocal: false,
      online: true,
      cursor: null,
      lastActive: Date.now(),
    });
  }
  return collaborators;
}

// 协作者颜色（基于 clientId 的稳定色）
function collaboratorColor(clientId: number): string {
  const colors = [
    "#a64953", "#5e9f7e", "#3d6896", "#c47b3e",
    "#7b5ec4", "#3e9fc4", "#c43e7b", "#5ec46f",
  ];
  return colors[clientId % colors.length];
}

// 广播给房间内所有客户端（可选排除发送者）
function broadcastToRoom(docId: string, message: string, exclude?: WebSocket): void {
  const room = rooms.get(docId);
  if (!room) return;
  for (const client of room) {
    if (client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// ─────────── 在线人数 ───────────
function sendOnlineCount(teamId: string | null): void {
  const total = onlineUsers.size;
  const teamOnline = teamId ? getTeamOnlineCount(teamId) : 0;
  const message = JSON.stringify({
    type: "online_count",
    total,
    teamOnline,
    teamId,
  } as WSMessage);
  broadcastToTeam(teamId, message);
}

function sendUserStatus(userId: string, name: string, teamId: string | null, status: "online" | "offline"): void {
  const message = JSON.stringify({
    type: "user_status",
    userId,
    name,
    status,
  } as WSMessage);
  broadcastToTeam(teamId, message);
}

// 按团队过滤广播
function broadcastToTeam(teamId: string | null, message: string): void {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const ext = client as ExtWS;
    if (teamId === null) {
      // 无团队上下文的消息广播给所有人
      client.send(message);
    } else if (ext.__teamId === teamId) {
      client.send(message);
    }
  });
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}

export function getTeamOnlineCount(teamId: string): number {
  let count = 0;
  onlineUsers.forEach((sessions) => {
    // 检查所有会话的 teamId,任一会话匹配即算在线
    if (sessions.some((s) => s.teamId === teamId)) {
      count++;
    }
  });
  return count;
}

/** 获取房间内在线协作者数（供 REST 使用） */
export function getRoomOnlineCount(docId: string): number {
  return rooms.get(docId)?.size ?? 0;
}
