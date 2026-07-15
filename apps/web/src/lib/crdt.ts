/**
 * CodeZone · CRDT 文本合并引擎 (RGA — Replicated Growable Array)
 *
 * 每个字符携带逻辑时钟 (clientId, clock),以 leftOrigin 锚定插入位置。
 * 并发插入通过 CharId 全序比较确定唯一顺序,保证所有副本收敛到相同状态。
 *
 * 核心保证:
 * - 多字符插入拆分为单字符 TextChar,每个有唯一 (client, clock+i) ID
 * - 并发插入同一位置时,按 (client, clock) 字典序确定先后 (C1 tiebreaker)
 * - 兄弟节点的后代紧随该兄弟之后,通过 leftOrigin 链判定归属 (C1 descendant)
 * - tombstone 删除,保留操作历史以支持因果一致的重放
 *
 * 性能:
 * - charIndex Map 提供 O(1) 去重与 leftOrigin 链查找
 * - 数组 splice 为 O(n),对中等规模文档(万级字符)可接受
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
  /** insert: 字符串(可多字符); delete: 删除长度 */
  content?: string;
  length?: number;
  timestamp: number;
}

/** CharId 全序比较:先按 client,再按 clock */
function compareCharId(a: CharId, b: CharId): number {
  return a.client !== b.client ? a.client - b.client : a.clock - b.clock;
}

function idKey(id: CharId): string {
  return `${id.client}:${id.clock}`;
}

export class CRDTText {
  private chars: TextChar[] = [];
  /** O(1) 查找:CharId → TextChar 引用 (与 chars 数组共享对象) */
  private charIndex: Map<string, TextChar> = new Map();
  private clock = 0;
  readonly clientId: number;

  constructor(clientId: number, initialText = "") {
    this.clientId = clientId;
    if (initialText) {
      this.insertLocal(0, initialText);
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

  /** 本地插入 — 返回操作日志 (支持多字符,内部拆分为单字符 TextChar) */
  insertLocal(offset: number, text: string): TextOp {
    const charCount = Array.from(text).length;
    if (charCount === 0) {
      // 空插入仍消耗一个时钟,保持与调用方预期一致
      this.clock += 1;
      return { type: "insert", client: this.clientId, clock: this.clock, offset, content: "", timestamp: Date.now() };
    }
    // op.clock 是第一个字符的时钟;后续字符为 clock+1, ..., clock+charCount-1
    this.clock += charCount;
    const op: TextOp = {
      type: "insert",
      client: this.clientId,
      clock: this.clock - charCount + 1,
      offset,
      content: text,
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

  /**
   * 应用远程插入操作 — RGA 算法
   *
   * 1. 去重:检查首字符 ID 是否已存在
   * 2. 确定 leftOrigin:基于 op.offset 在可见文本中的位置
   * 3. RGA 扫描:从 leftOrigin 之后,跳过所有应排在前面的字符
   *    (兄弟节点中 CharId 更小的,及其后代)
   * 4. 拆分多字符内容为单字符 TextChar,顺序插入
   */
  applyInsert(op: TextOp): void {
    const content = op.content ?? "";
    const charList = Array.from(content);
    if (charList.length === 0) return;

    // 去重:检查首字符是否已存在
    const baseId: CharId = { client: op.client, clock: op.clock };
    if (this.charIndex.has(idKey(baseId))) return;

    const visible = this.visibleChars();
    const insertIdx = Math.min(op.offset, visible.length);
    const leftOrigin = insertIdx > 0 ? visible[insertIdx - 1].id : null;

    // RGA 扫描:找到正确的数组插入位置
    const newFirstId: CharId = { client: op.client, clock: op.clock };
    let arrayIdx = this.findInsertionIndex(leftOrigin, newFirstId);

    // 拆分多字符内容为单字符,顺序插入
    for (let i = 0; i < charList.length; i++) {
      const charId: CharId = { client: op.client, clock: op.clock + i };
      const newChar: TextChar = {
        id: charId,
        ch: charList[i],
        leftOrigin: i === 0 ? leftOrigin : { client: op.client, clock: op.clock + i - 1 },
        deleted: false,
      };
      this.chars.splice(arrayIdx + i, 0, newChar);
      this.charIndex.set(idKey(charId), newChar);
    }
    this.clock = Math.max(this.clock, op.clock + charList.length - 1);
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

  /**
   * RGA 插入位置查找:在 leftOrigin 之后,跳过所有应排在前面的字符。
   *
   * 一个字符应排在新字符之前的条件:
   * 它的 leftOrigin 链上存在一个直接子节点(leftOrigin == 我们的 leftOrigin),
   * 且该子节点的 CharId < 新字符的 CharId。
   * (即:它是某个"应排在前面"的兄弟的后代)
   *
   * 扫描在遇到第一个"不应排在前面"的字符时停止 —
   * 因为 RGA 中 leftOrigin 的子树是连续的,遇到非子树成员说明子树已结束。
   */
  private findInsertionIndex(leftOrigin: CharId | null, newId: CharId): number {
    let idx = 0;
    if (leftOrigin) {
      const leftChar = this.charIndex.get(idKey(leftOrigin));
      if (!leftChar) return this.chars.length; // leftOrigin 不存在,追加到末尾
      idx = this.chars.indexOf(leftChar) + 1;
      if (idx === 0) return this.chars.length; // indexOf 返回 -1
    }

    while (idx < this.chars.length) {
      if (this.shouldPrecede(this.chars[idx], leftOrigin, newId)) {
        idx++;
      } else {
        break;
      }
    }
    return idx;
  }

  /**
   * 检查 candidate 是否应排在新字符之前。
   * 沿 candidate 的 leftOrigin 链向上查找,直到找到 leftOrigin 的直接子节点。
   * 若该子节点的 CharId < newId,则 candidate (作为其后代) 应排在前面。
   * 若未找到这样的子节点,candidate 不在 leftOrigin 的子树中,不排在前面。
   */
  private shouldPrecede(candidate: TextChar, leftOrigin: CharId | null, newId: CharId): boolean {
    let current: TextChar | undefined = candidate;
    let guard = 0; // 防御性深度限制
    while (current && guard < 10000) {
      guard++;
      const currLeft = current.leftOrigin;

      // 检查 current 是否为 leftOrigin 的直接子节点
      const isDirectChild = leftOrigin === null
        ? currLeft === null
        : currLeft !== null &&
          currLeft.client === leftOrigin.client &&
          currLeft.clock === leftOrigin.clock;

      if (isDirectChild) {
        // 找到 leftOrigin 的直接子节点:按 CharId 比较
        return compareCharId(current.id, newId) < 0;
      }

      // 沿 leftOrigin 链继续向上查找
      if (!currLeft) break;
      current = this.charIndex.get(idKey(currLeft));
    }
    return false; // 不在 leftOrigin 的子树中
  }

  /** 计算从 oldText 到 newText 的最小操作集 (批量 diff) */
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
      const charCount = Array.from(inserted).length;
      c += 1;
      // op.clock 是首字符时钟;applyInsert 会为后续字符使用 clock+1, ..., clock+charCount-1
      ops.push({ type: "insert", client, clock: c, offset: prefix, content: inserted, timestamp: Date.now() });
      c += charCount - 1; // 预留后续字符的时钟
    }
    return ops;
  }
}
