/**
 * CodeZone · WebSocket 服务
 *
 * 维护在线用户连接池，广播在线人数。
 * 客户端通过 JWT token 认证。
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "./auth.js";
import { teamMemberRepo } from "./repository.js";

interface OnlineUser {
  userId: string;
  name: string;
  teamId: string | null;
  ws: WebSocket;
}

const onlineUsers = new Map<string, OnlineUser[]>();

let wss: WebSocketServer;

export function attachWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
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

    const online: OnlineUser = { userId: user.id, name: user.name, teamId, ws };

    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, []);
    }
    onlineUsers.get(user.id)!.push(online);

    sendOnlineCount(teamId);
    sendUserStatus(user.id, "online");

    ws.on("close", () => {
      const sessions = onlineUsers.get(user.id);
      if (sessions) {
        const idx = sessions.indexOf(online);
        if (idx !== -1) sessions.splice(idx, 1);
        if (sessions.length === 0) {
          onlineUsers.delete(user.id);
          sendUserStatus(user.id, "offline");
        }
      }
      sendOnlineCount(teamId);
    });

    ws.on("error", () => {});
  });
}

function sendOnlineCount(teamId: string | null): void {
  let count = 0;
  if (teamId) {
    onlineUsers.forEach((sessions) => {
      if (sessions.length > 0 && sessions[0].teamId === teamId) {
        count++;
      }
    });
  } else {
    count = onlineUsers.size;
  }

  const message = JSON.stringify({ type: "online_count", count, teamId });
  broadcastToTeam(teamId, message);
}

function sendUserStatus(userId: string, status: "online" | "offline"): void {
  const sessions = onlineUsers.get(userId);
  const user = sessions?.[0];
  if (!user) return;

  const message = JSON.stringify({
    type: "user_status",
    userId,
    name: user.name,
    status,
  });
  broadcastToTeam(user.teamId, message);
}

function broadcastToTeam(teamId: string | null, message: string): void {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
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
    if (sessions.length > 0 && sessions[0].teamId === teamId) {
      count++;
    }
  });
  return count;
}