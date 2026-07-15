/**
 * CodeZone · Awareness 感知协议
 *
 * 管理协作会话中的瞬时状态: 在线用户、光标位置、选区、正在编辑标记。
 * 参考 Y.js Awareness 的 State-based CRDT 设计:
 * - 每个客户端维护本地状态 + 递增时钟
 * - 接收方仅接受更新的时钟
 * - 30s 无心跳判定离线
 */

export interface Collaborator {
  id: number;
  name: string;
  color: string;
  avatarInitial: string;
  isLocal: boolean;
  online: boolean;
  cursor: CursorState | null;
  lastActive: number;
}

export interface CursorState {
  lineNumber: number;
  column: number;
  selectionStart?: { lineNumber: number; column: number };
  selectionEnd?: { lineNumber: number; column: number };
}

export type AwarenessListener = (collaborators: Collaborator[]) => void;

export class Awareness {
  private local: Collaborator;
  private remote: Map<number, Collaborator> = new Map();
  private listeners: Set<AwarenessListener> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(localUser: Omit<Collaborator, "cursor" | "lastActive" | "online" | "isLocal">) {
    this.local = {
      ...localUser,
      isLocal: true,
      online: true,
      cursor: null,
      lastActive: Date.now(),
    };
  }

  /** 启动心跳 (清理离线协作者) */
  startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, c] of this.remote) {
        if (now - c.lastActive > 30000 && c.online) {
          c.online = false;
          changed = true;
        }
      }
      if (changed) this.emit();
    }, 5000);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /** 更新本地光标 */
  setLocalCursor(cursor: CursorState | null): void {
    this.local.cursor = cursor;
    this.local.lastActive = Date.now();
    this.emit();
  }

  /** 更新远程协作者状态 (来自模拟网络) */
  updateRemote(id: number, patch: Partial<Collaborator>): void {
    const existing = this.remote.get(id);
    const updated: Collaborator = {
      ...(existing ?? {
        id,
        name: `协作者 ${id}`,
        color: "#787670",
        avatarInitial: String(id),
        isLocal: false,
        online: true,
        cursor: null,
        lastActive: Date.now(),
      }),
      ...patch,
      lastActive: Date.now(),
    };
    this.remote.set(id, updated);
    this.emit();
  }

  /** 协作者离线 */
  removeRemote(id: number): void {
    const c = this.remote.get(id);
    if (c) {
      c.online = false;
      this.emit();
    }
  }

  /** 获取所有协作者 (含本地) */
  getAll(): Collaborator[] {
    return [this.local, ...Array.from(this.remote.values())];
  }

  /** 获取在线协作者 */
  getOnline(): Collaborator[] {
    return this.getAll().filter((c) => c.online);
  }

  /** 获取本地协作者 */
  getLocal(): Collaborator {
    return this.local;
  }

  /** 订阅变更 */
  on(listener: AwarenessListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const all = this.getAll();
    this.listeners.forEach((l) => l(all));
  }
}
