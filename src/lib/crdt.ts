/**
 * CodeZone · CRDT 文本合并引擎
 *
 * 基于 Operation Log 的简化 CRDT 文本模型。
 * 每个字符携带逻辑时钟 (clientId, clock),插入/删除以字符 ID 为锚,
 * 保证并发操作在所有副本上以相同顺序收敛。
 *
 * 设计参考 Y.js / Automerge 的核心思想,但为单页演示场景做了精简:
 * - 不做真实网络同步,在内存中维护单一权威副本
 * - 远程操作通过 VirtualCollaborator 模拟注入
 * - Awareness 协议独立维护光标/选区/在线状态
 */

export interface CharId {
  client: number;
  clock: number;
}

export interface TextChar {
  id: CharId;
  ch: string;
  /** 左侧锚点字符 ID (用于确定插入位置) */
  leftOrigin: CharId | null;
  /** 是否已被删除 (tombstone) */
  deleted: boolean;
}

export interface TextOp {
  type: "insert" | "delete";
  client: number;
  clock: number;
  /** insert: 插入位置(基于当前可见文本的 offset); delete: 同理 */
  offset: number;
  /** insert: 字符; delete: 删除长度 */
  content?: string;
  length?: number;
  timestamp: number;
}

export class CRDTText {
  private chars: TextChar[] = [];
  private clock = 0;
  readonly clientId: number;

  constructor(clientId: number, initialText = "") {
    this.clientId = clientId;
    if (initialText) {
      for (const ch of initialText) {
        this.insertLocal(this.chars.length, ch);
      }
    }
  }

  /** 当前可见文本 */
  toString(): string {
    return this.chars.filter((c) => !c.deleted).map((c) => c.ch).join("");
  }

  /** 当前逻辑时钟 */
  getClock(): number {
    return this.clock;
  }

  /** 获取可见字符数组 (含 ID) */
  visibleChars(): TextChar[] {
    return this.chars.filter((c) => !c.deleted);
  }

  /** 本地插入 — 返回操作日志 */
  insertLocal(offset: number, ch: string): TextOp {
    this.clock += 1;
    const op: TextOp = {
      type: "insert",
      client: this.clientId,
      clock: this.clock,
      offset,
      content: ch,
      timestamp: Date.now(),
    };
    this.applyInsert(op);
    return op;
  }

  /** 本地删除 */
  deleteLocal(offset: number, length: number): TextOp {
    this.clock += 1;
    const op: TextOp = {
      type: "delete",
      client: this.clientId,
      clock: this.clock,
      offset,
      length,
      timestamp: Date.now(),
    };
    this.applyDelete(op);
    return op;
  }

  /** 应用远程插入操作 */
  applyInsert(op: TextOp): void {
    const id: CharId = { client: op.client, clock: op.clock };
    // 去重
    if (this.chars.some((c) => c.id.client === id.client && c.id.clock === id.clock)) return;

    const visible = this.visibleChars();
    const insertIdx = Math.min(op.offset, visible.length);
    const leftOrigin = insertIdx > 0 ? visible[insertIdx - 1].id : null;

    const newChar: TextChar = {
      id,
      ch: op.content ?? "",
      leftOrigin,
      deleted: false,
    };

    // 找到插入点在 chars 数组中的实际位置 (在 leftOrigin 之后, 或开头)
    let arrayIdx = 0;
    if (leftOrigin) {
      const leftIdx = this.chars.findIndex(
        (c) => c.id.client === leftOrigin.client && c.id.clock === leftOrigin.clock,
      );
      arrayIdx = leftIdx + 1;
    }
    this.chars.splice(arrayIdx, 0, newChar);
    this.clock = Math.max(this.clock, op.clock);
  }

  /** 应用远程删除操作 */
  applyDelete(op: TextOp): void {
    const visible = this.visibleChars();
    const start = Math.min(op.offset, visible.length);
    const end = Math.min(start + (op.length ?? 0), visible.length);
    for (let i = start; i < end; i++) {
      visible[i].deleted = true;
    }
    this.clock = Math.max(this.clock, op.clock);
  }

  /** 应用任意操作 */
  applyOp(op: TextOp): void {
    if (op.type === "insert") this.applyInsert(op);
    else this.applyDelete(op);
  }

  /** 计算从 oldText 到 newText 的最小操作集 (简化 diff) */
  static diff(oldText: string, newText: string, client: number, clock: number): TextOp[] {
    const ops: TextOp[] = [];
    // 找公共前缀
    let prefix = 0;
    while (
      prefix < oldText.length &&
      prefix < newText.length &&
      oldText[prefix] === newText[prefix]
    ) {
      prefix++;
    }
    // 找公共后缀
    let suffix = 0;
    while (
      suffix < oldText.length - prefix &&
      suffix < newText.length - prefix &&
      oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
    ) {
      suffix++;
    }

    const deleteLen = oldText.length - prefix - suffix;
    const inserted = newText.slice(prefix, newText.length - suffix);

    let c = clock;
    if (deleteLen > 0) {
      c += 1;
      ops.push({ type: "delete", client, clock: c, offset: prefix, length: deleteLen, timestamp: Date.now() });
    }
    if (inserted.length > 0) {
      for (let i = 0; i < inserted.length; i++) {
        c += 1;
        ops.push({ type: "insert", client, clock: c, offset: prefix + i, content: inserted[i], timestamp: Date.now() });
      }
    }
    return ops;
  }
}
