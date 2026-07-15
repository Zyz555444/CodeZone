/**
 * CodeZone · 虚拟协作者引擎
 *
 * 模拟真实的多人实时协作: 虚拟协作者会像真人一样
 * 定时输入代码、移动光标、选中片段、偶尔停顿思考。
 *
 * 每个虚拟协作者有自己的 clientId, 产生 TextOp 注入 CRDT 文档,
 * 并同步 Awareness 状态 (光标位置), 让本地用户看到"有人正在编辑"。
 */

import { CRDTText, type TextOp } from "./crdt";
import { Awareness, type CursorState } from "./awareness";

export interface VirtualCollaboratorConfig {
  id: number;
  name: string;
  color: string;
  /** 输入速度: 每次输入间隔 ms */
  speed: number;
  /** 停顿概率 (0-1, 输入后停顿思考的概率) */
  pauseChance: number;
}

interface VirtualState {
  config: VirtualCollaboratorConfig;
  clock: number;
  timer: ReturnType<typeof setTimeout> | null;
  paused: boolean;
}

export interface CollaboratorEvent {
  type: "op" | "cursor" | "join" | "leave";
  collaboratorId: number;
  op?: TextOp;
  cursor?: CursorState | null;
}

export type CollaboratorEventListener = (event: CollaboratorEvent) => void;

export class VirtualCollaboratorEngine {
  private states: Map<number, VirtualState> = new Map();
  private doc: CRDTText;
  private awareness: Awareness;
  private listeners: Set<CollaboratorEventListener> = new Set();
  private running = false;

  /** 协作者会输入的代码片段库 (按语言) */
  private snippets: Record<string, string[]> = {
    typescript: [
      "function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {",
      "  let timer: ReturnType<typeof setTimeout>;",
      "  return (...args: Parameters<T>) => {",
      "    clearTimeout(timer);",
      "    timer = setTimeout(() => fn(...args), ms);",
      "  };",
      "}",
      "",
      "// 使用防抖优化搜索输入",
      "const handleSearch = debounce((q: string) => {",
      "  api.search(q).then(setResults);",
      "}, 300);",
      "",
      "export interface Result { id: string; title: string; }",
      "const [results, setResults] = useState<Result[]>([]);",
    ],
    python: [
      "from dataclasses import dataclass",
      "from typing import List, Optional",
      "",
      "@dataclass",
      "class Issue:",
      "    id: str",
      "    title: str",
      "    status: str = 'open'",
      "    assignee: Optional[str] = None",
      "",
      "    def close(self) -> None:",
      "        self.status = 'closed'",
      "        print(f'Issue #{self.id} closed')",
    ],
    rust: [
      "use std::collections::HashMap;",
      "",
      "fn main() {",
      "    let mut scores: HashMap<String, u32> = HashMap::new();",
      "    scores.insert(String::from('blue'), 10);",
      "    scores.insert(String::from('red'), 50);",
      "    for (team, score) in &scores {",
      "        println!(\"{team}: {score}\");",
      "    }",
      "}",
    ],
  };

  constructor(doc: CRDTText, awareness: Awareness) {
    this.doc = doc;
    this.awareness = awareness;
  }

  on(listener: CollaboratorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CollaboratorEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  /** 添加一个虚拟协作者 */
  addCollaborator(config: VirtualCollaboratorConfig): void {
    if (this.states.has(config.id)) return;
    const state: VirtualState = { config, clock: 1000 + config.id * 1000, timer: null, paused: false };
    this.states.set(config.id, state);

    // 加入感知
    this.awareness.updateRemote(config.id, {
      name: config.name,
      color: config.color,
      avatarInitial: config.name.charAt(0),
      online: true,
      cursor: null,
    });
    this.emit({ type: "join", collaboratorId: config.id });

    if (this.running) this.scheduleNext(state);
  }

  /** 移除协作者 */
  removeCollaborator(id: number): void {
    const state = this.states.get(id);
    if (!state) return;
    if (state.timer) clearTimeout(state.timer);
    this.states.delete(id);
    this.awareness.removeRemote(id);
    this.emit({ type: "leave", collaboratorId: id });
  }

  /** 启动引擎 */
  start(): void {
    this.running = true;
    for (const state of this.states.values()) {
      this.scheduleNext(state);
    }
  }

  /** 停止引擎 */
  stop(): void {
    this.running = false;
    for (const state of this.states.values()) {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    }
  }

  private scheduleNext(state: VirtualState): void {
    if (!this.running) return;
    const delay = state.config.speed + (state.paused ? 1500 + Math.random() * 2000 : 0);
    state.timer = setTimeout(() => this.tick(state), delay);
  }

  private tick(state: VirtualState): void {
    if (!this.running) return;
    const { config } = state;

    // 选择动作: 70% 输入, 20% 移动光标, 10% 选中片段
    const roll = Math.random();
    if (roll < 0.7) {
      this.performInsert(state);
    } else if (roll < 0.9) {
      this.performCursorMove(state);
    } else {
      this.performSelection(state);
    }

    // 偶尔停顿
    state.paused = Math.random() < config.pauseChance;
    this.scheduleNext(state);
  }

  private performInsert(state: VirtualState): void {
    const { config } = state;
    const text = this.doc.toString();
    const lines = text.split("\n");
    const lang = "typescript";
    const snippets = this.snippets[lang] ?? this.snippets.typescript;

    // 选择策略: 60% 接续输入下一行片段, 40% 随机位置插入字符
    if (Math.random() < 0.6) {
      // 找一个尚未完整输入的片段行,在文末追加
      const nextSnippet = snippets.find((s) => !text.includes(s));
      if (nextSnippet) {
        // 在文本末尾追加该行 (带换行)
        const offset = text.length;
        const content = (text.length > 0 ? "\n" : "") + nextSnippet;
        // 多字符插入:时钟需按字符数推进,避免后续 op 与本次插入的字符 ID 冲突
        const charCount = Array.from(content).length;
        state.clock += charCount;
        const op: TextOp = {
          type: "insert",
          client: config.id,
          clock: state.clock - charCount + 1, // 首字符时钟
          offset,
          content,
          timestamp: Date.now(),
        };
        this.doc.applyInsert(op);
        this.emit({ type: "op", collaboratorId: config.id, op });

        // 同步光标到插入位置
        const pos = offsetToCursor(text + (text.length > 0 ? "\n" : "") + nextSnippet);
        this.updateCursor(config.id, pos);
        return;
      }
    }

    // 随机插入单个字符 (模拟微编辑)
    const offset = Math.floor(Math.random() * Math.max(text.length, 1));
    const chars = "abcdef ;,=>{}";
    const ch = chars[Math.floor(Math.random() * chars.length)];
    state.clock += 1;
    const op: TextOp = {
      type: "insert",
      client: config.id,
      clock: state.clock,
      offset,
      content: ch,
      timestamp: Date.now(),
    };
    this.doc.applyInsert(op);
    this.emit({ type: "op", collaboratorId: config.id, op });
    this.updateCursor(config.id, offsetToCursor(this.doc.toString().slice(0, offset + 1)));
  }

  private performCursorMove(state: VirtualState): void {
    const text = this.doc.toString();
    const lines = text.split("\n");
    const lineNumber = 1 + Math.floor(Math.random() * Math.max(lines.length, 1));
    const column = 1 + Math.floor(Math.random() * Math.max((lines[lineNumber - 1]?.length ?? 0) + 1, 1));
    this.updateCursor(state.config.id, { lineNumber, column });
  }

  private performSelection(state: VirtualState): void {
    const text = this.doc.toString();
    const lines = text.split("\n");
    const lineIdx = Math.floor(Math.random() * Math.max(lines.length, 1));
    const line = lines[lineIdx] ?? "";
    if (line.length < 2) {
      this.performCursorMove(state);
      return;
    }
    const startCol = 1 + Math.floor(Math.random() * (line.length - 1));
    const endCol = Math.min(startCol + 3 + Math.floor(Math.random() * 8), line.length + 1);
    const cursor: CursorState = {
      lineNumber: lineIdx + 1,
      column: endCol,
      selectionStart: { lineNumber: lineIdx + 1, column: startCol },
      selectionEnd: { lineNumber: lineIdx + 1, column: endCol },
    };
    this.updateCursor(state.config.id, cursor);
  }

  private updateCursor(id: number, cursor: CursorState): void {
    this.awareness.updateRemote(id, { cursor, online: true });
    this.emit({ type: "cursor", collaboratorId: id, cursor });
  }
}

/** 偏移量 → 行列光标 */
function offsetToCursor(text: string): CursorState {
  const before = text;
  const lines = before.split("\n");
  const lineNumber = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { lineNumber, column };
}
