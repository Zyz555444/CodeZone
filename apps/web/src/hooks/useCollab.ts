// CodeZone · 协作会话 Hook
//
// 管理 WebSocket 文档房间：加入/离开、操作收发、光标感知、协作者列表。
// 供 CollaborativeEditor 在 "live" 模式下使用。
//
// 设计要点：
// - 回调用 ref 存储，docId 变化才重新订阅（避免回调变化导致重连）
// - onContentInit 传入 clientId，让调用方正确初始化 CRDT
// - 远程操作过滤掉自己发的（通过 clientId 比较）
import { useEffect, useRef, useState, useCallback } from "react";
import { wsClient } from "@/hooks/useWebSocket";
import type { WSMessage, TextOp, CursorState, Collaborator } from "@/lib/types";

interface UseCollabOptions {
  docId: string | null;
  clientName: string;
  onRemoteOp?: (op: TextOp) => void;
  onContentInit?: (content: string, clientId: number) => void;
  onAwareness?: (collaborator: Collaborator) => void;
  onCollaboratorsChange?: (collaborators: Collaborator[]) => void;
}

interface UseCollabReturn {
  joined: boolean;
  clientId: number | null;
  collaborators: Collaborator[];
  sendOp: (op: TextOp) => void;
  sendCursor: (cursor: CursorState | null) => void;
}

const COLORS = [
  "#a64953", "#5e9f7e", "#3d6896", "#c47b3e",
  "#7b5ec4", "#3e9fc4", "#c43e7b", "#5ec46f",
];

function colorFor(clientId: number): string {
  return COLORS[clientId % COLORS.length];
}

export function useCollab(opts: UseCollabOptions): UseCollabReturn {
  const { docId, clientName } = opts;
  const [joined, setJoined] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const clientIdRef = useRef<number | null>(null);
  const docIdRef = useRef<string | null>(null);
  const nameRef = useRef(clientName);
  nameRef.current = clientName;
  const cbRef = useRef(opts);
  cbRef.current = opts;

  useEffect(() => {
    if (!docId) {
      setJoined(false);
      setClientId(null);
      clientIdRef.current = null;
      setCollaborators([]);
      return;
    }

    docIdRef.current = docId;
    let active = true;

    // 订阅 WS 消息
    const unsub = wsClient.subscribe((msg: WSMessage) => {
      if (!active) return;

      // 只处理当前文档的消息
      const msgDocId = "docId" in msg ? msg.docId : null;
      if (msgDocId !== docIdRef.current) return;

      switch (msg.type) {
        case "room_joined":
          clientIdRef.current = msg.clientId;
          setClientId(msg.clientId);
          setJoined(true);
          setCollaborators(msg.collaborators);
          cbRef.current.onContentInit?.(msg.content, msg.clientId);
          break;
        case "doc_op":
          // 防御:畸形消息可能缺少 op 字段
          if (!msg.op) return;
          // 过滤掉自己发的操作
          if (msg.op.client !== clientIdRef.current) {
            cbRef.current.onRemoteOp?.(msg.op);
          }
          break;
        case "awareness":
          if (!msg.collaborator) return;
          cbRef.current.onAwareness?.(msg.collaborator);
          break;
        case "presence":
          setCollaborators(msg.collaborators ?? []);
          break;
        case "error":
          console.error("[Collab] 错误:", msg.message);
          break;
      }
    });

    // 发送 join_room
    wsClient.send({ type: "join_room", docId });

    return () => {
      active = false;
      unsub();
      // 离开房间
      if (docIdRef.current) {
        wsClient.send({ type: "leave_room", docId: docIdRef.current });
      }
      docIdRef.current = null;
      clientIdRef.current = null;
      setJoined(false);
      setClientId(null);
      setCollaborators([]);
    };
  }, [docId]);

  const sendOp = useCallback((op: TextOp) => {
    const cid = clientIdRef.current;
    const did = docIdRef.current;
    if (!cid || !did) return;
    wsClient.send({
      type: "doc_op",
      docId: did,
      op,
      client: cid,
      clientName: nameRef.current,
    });
  }, []);

  const sendCursor = useCallback((cursor: CursorState | null) => {
    const cid = clientIdRef.current;
    const did = docIdRef.current;
    if (!cid || !did) return;
    const collaborator: Collaborator = {
      id: cid,
      name: nameRef.current,
      color: colorFor(cid),
      avatarInitial: nameRef.current.charAt(0),
      isLocal: false,
      online: true,
      cursor,
      lastActive: Date.now(),
    };
    wsClient.send({
      type: "awareness",
      docId: did,
      collaborator,
    });
  }, []);

  return { joined, clientId, collaborators, sendOp, sendCursor };
}
