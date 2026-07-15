import { useEffect, useRef, useState, useCallback } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
  Wifi, Users, Radio, Pause, Play, UserPlus, UserMinus,
  Save, Check, Loader,
} from "lucide-react";
import { CRDTText, type TextOp } from "@/lib/crdt";
import { Awareness, type Collaborator, type CursorState } from "@/lib/awareness";
import { VirtualCollaboratorEngine, type VirtualCollaboratorConfig } from "@/lib/virtualCollaborators";
import { useCollab } from "@/hooks/useCollab";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";

interface CollaborativeEditorProps {
  docId: string | null;
  initialContent?: string;
  language?: string;
  fileName?: string;
  mode: "live" | "demo";
  onSave?: (content: string) => Promise<void>;
  /** 内容变化时回调（含远程操作引起的变化），用于实时同步最新内容到外部 ref */
  onContentChange?: (content: string) => void;
}

type SaveState = "idle" | "pending" | "saving" | "saved";

const collaboratorConfigs: VirtualCollaboratorConfig[] = [
  { id: 2, name: "陈砚秋", color: "#a64953", speed: 1200, pauseChance: 0.15 },
  { id: 3, name: "苏映雪", color: "#5e9f7e", speed: 1800, pauseChance: 0.2 },
  { id: 4, name: "周时砚", color: "#3d6896", speed: 2400, pauseChance: 0.25 },
];

const initialCode = `// CodeZone 实时协作编辑器
// 多人可同时编辑此文件 — 尝试输入,你会看到虚拟协作者实时响应
//
// 基于 CRDT (Conflict-free Replicated Data Type) 文本合并:
// - 并发插入/删除无冲突自动收敛
// - 每个字符携带 (clientId, clock) 逻辑时钟
// - 删除采用 tombstone 标记,保留操作历史
//
// Awareness 感知协议:
// - 实时光标位置同步 (彩色光标 + 姓名标签)
// - 选区高亮
// - 在线状态 (30s 心跳)

import { useState, useEffect } from "react";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const add = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: crypto.randomUUID(), text: input, done: false }]);
    setInput("");
  };

  const toggle = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="todo-list">
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add}>添加</button>
      {todos.map(todo => (
        <li key={todo.id} onClick={() => toggle(todo.id)}>
          {todo.done ? "✓ " : ""}{todo.text}
        </li>
      ))}
    </div>
  );
}
`;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function CollaborativeEditor({
  docId,
  initialContent,
  language = "typescript",
  fileName = "TodoList.tsx",
  mode,
  onSave,
  onContentChange,
}: CollaborativeEditorProps) {
  const isLive = mode === "live";
  const isDemo = mode === "demo";

  const { currentUser } = useAppStore();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  // demo 模式初始内容:优先 initialContent,否则使用 initialCode 默认示例
  const demoInitial =
    initialContent && initialContent.length > 0 ? initialContent : initialCode;

  // CRDT 文档:demo 模式立即初始化;live 模式等待 onContentInit 用真实 clientId 重建
  const docRef = useRef<CRDTText>(
    isDemo ? new CRDTText(1, demoInitial) : new CRDTText(1, ""),
  );

  // Awareness:本地用户信息 (id=1 为本地占位,live 模式真实 clientId 由服务端分配)
  const awarenessRef = useRef<Awareness>(
    new Awareness({
      id: 1,
      name: currentUser?.name ?? "访客",
      color: "#33a6b8",
      avatarInitial: (currentUser?.name ?? "?").charAt(0),
    }),
  );

  const engineRef = useRef<VirtualCollaboratorEngine | null>(null);
  const applyingRemote = useRef(false);
  const pendingContent = useRef<{ content: string; clientId: number } | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDirtyRef = useRef(false);
  const isMountedRef = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [running, setRunning] = useState(false);
  const [opCount, setOpCount] = useState(0);
  const [latency, setLatency] = useState(38);
  const [activeCollabIds, setActiveCollabIds] = useState<Set<number>>(new Set([2, 3, 4]));
  const [followId, setFollowId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // 应用远程操作到 Monaco (不检查 op.client,调用方保证为远程操作)
  const applyRemoteOp = useCallback((op: TextOp) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    editor.pushUndoStop();
    if (op.type === "insert") {
      const pos = model.getPositionAt(op.offset);
      const range = new monaco.Range(
        pos.lineNumber, pos.column, pos.lineNumber, pos.column,
      );
      model.applyEdits([{ range, text: op.content ?? "" }]);
    } else if (op.type === "delete") {
      const startPos = model.getPositionAt(op.offset);
      const endPos = model.getPositionAt(op.offset + (op.length ?? 0));
      const range = new monaco.Range(
        startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column,
      );
      model.applyEdits([{ range, text: "" }]);
    }
    editor.pushUndoStop();
  }, []);

  // live 模式:远程操作同时更新 CRDT 与 Monaco
  const handleRemoteOp = useCallback((op: TextOp) => {
    // try/finally 保护:applyEdits 抛异常时 applyingRemote 也能被正确重置
    applyingRemote.current = true;
    try {
      docRef.current.applyOp(op);
      applyRemoteOp(op);
    } finally {
      applyingRemote.current = false;
    }
    setOpCount((c) => c + 1);
    setLatency(20 + Math.floor(Math.random() * 40));
  }, [applyRemoteOp]);

  // demo 模式:引擎已直接操作 CRDT,这里只同步 Monaco
  const handleEngineOp = useCallback((op: TextOp) => {
    applyingRemote.current = true;
    try {
      applyRemoteOp(op);
    } finally {
      applyingRemote.current = false;
    }
    setOpCount((c) => c + 1);
    setLatency(20 + Math.floor(Math.random() * 40));
  }, [applyRemoteOp]);

  // live 模式:房间加入后用真实 clientId 重建 CRDT 并填充内容
  const handleContentInit = useCallback((content: string, clientId: number) => {
    docRef.current = new CRDTText(clientId, content);
    const editor = editorRef.current;
    if (editor) {
      applyingRemote.current = true;
      editor.setValue(content);
      applyingRemote.current = false;
    } else {
      // 编辑器尚未挂载,缓存内容待挂载时应用
      pendingContent.current = { content, clientId };
    }
  }, []);

  // live 模式:远程光标感知
  const handleAwareness = useCallback((collaborator: Collaborator) => {
    awarenessRef.current.updateRemote(collaborator.id, collaborator);
  }, []);

  // 始终调用 useCollab (demo 模式传 docId=null,内部不连接房间)
  const {
    joined,
    clientId,
    collaborators: collabCollaborators,
    sendOp,
    sendCursor,
  } = useCollab({
    docId: isLive ? docId : null,
    clientName: currentUser?.name ?? "访客",
    onRemoteOp: handleRemoteOp,
    onContentInit: handleContentInit,
    onAwareness: handleAwareness,
  });

  // Awareness 心跳 + (demo 模式)虚拟协作者引擎初始化
  useEffect(() => {
    const awareness = awarenessRef.current;
    const unsubAwareness = awareness.on(setCollaborators);
    awareness.startHeartbeat();
    setCollaborators(awareness.getAll());

    let unsubEngine: (() => void) | null = null;
    if (isDemo) {
      const engine = new VirtualCollaboratorEngine(docRef.current, awareness);
      engineRef.current = engine;
      unsubEngine = engine.on((event) => {
        if (event.type === "op" && event.op) {
          handleEngineOp(event.op);
        }
      });
    }

    return () => {
      unsubAwareness();
      if (unsubEngine) unsubEngine();
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      awareness.stopHeartbeat();
    };
  }, [isDemo, handleEngineOp]);

  // live 模式:同步 collab.collaborators (presence) 到 awareness (add/remove 远程协作者)
  useEffect(() => {
    if (!isLive) return;
    const awareness = awarenessRef.current;
    // 排除自己 (clientId 由服务端分配)
    const incoming = collabCollaborators.filter((c) => c.id !== clientId);
    const incomingIds = new Set(incoming.map((c) => c.id));

    const existingRemote = new Set<number>();
    for (const c of awareness.getAll()) {
      if (!c.isLocal) existingRemote.add(c.id);
    }

    for (const c of incoming) {
      awareness.updateRemote(c.id, c);
    }
    for (const id of existingRemote) {
      if (!incomingIds.has(id)) {
        awareness.removeRemote(id);
      }
    }
  }, [collabCollaborators, clientId, isLive]);

  // 启停虚拟协作者引擎 (demo 模式)
  const toggleEngine = useCallback(() => {
    if (!isDemo) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (running) {
      engine.stop();
      setRunning(false);
    } else {
      for (const id of activeCollabIds) {
        const cfg = collaboratorConfigs.find((c) => c.id === id);
        if (cfg) engine.addCollaborator(cfg);
      }
      engine.start();
      setRunning(true);
    }
  }, [running, activeCollabIds, isDemo]);

  // 切换虚拟协作者在线状态 (demo 模式)
  const toggleCollaborator = useCallback((id: number) => {
    if (!isDemo) return;
    const engine = engineRef.current;
    setActiveCollabIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        engine?.removeCollaborator(id);
      } else {
        next.add(id);
        const cfg = collaboratorConfigs.find((c) => c.id === id);
        if (cfg && running) {
          engine?.addCollaborator(cfg);
        }
      }
      return next;
    });
  }, [running, isDemo]);

  // Monaco beforeMount:定义协作主题
  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("codezone-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#fefefb",
        "editorLineNumber.foreground": "#a8a69f",
        "editorLineNumber.activeForeground": "#5c5a55",
        "editorCursor.foreground": "#33a6b8",
        "editor.selectionBackground": "#33a6b81a",
        "editor.lineHighlightBackground": "#f9f8f5",
        "editorGutter.background": "#fefefb",
      },
    });
    monaco.editor.defineTheme("codezone-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1c1c1e",
        "editorLineNumber.foreground": "#545456",
        "editorLineNumber.activeForeground": "#9a9893",
        "editorCursor.foreground": "#f596aa",
        "editor.selectionBackground": "#f596aa26",
        "editor.lineHighlightBackground": "#242426",
        "editorGutter.background": "#1c1c1e",
      },
    });
  };

  // Monaco mount:注册内容/光标监听
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const savedTheme = localStorage.getItem("cz-theme") || "light";
    monaco.editor.setTheme(savedTheme === "dark" ? "codezone-dark" : "codezone-light");

    // 处理 room_joined 在编辑器挂载前到达的情况
    if (pendingContent.current) {
      editor.setValue(pendingContent.current.content);
      pendingContent.current = null;
    }

    // 本地编辑 → 生成 ops (使用 e.changes 的精确范围)
    editor.onDidChangeModelContent((e) => {
      // 始终同步最新内容到外部 ref（用于版本快照读取最新值）
      // 放在 applyingRemote 检查之前,确保远程操作引起的内容变化也被捕获
      if (onContentChangeRef.current) {
        onContentChangeRef.current(editor.getValue());
      }
      // 远程操作应用期间不生成本地 ops,避免循环
      if (applyingRemote.current) return;
      const model = editor.getModel();
      if (!model) return;

      for (const change of e.changes) {
        const offset = change.rangeOffset;
        if (change.rangeLength > 0) {
          const op = docRef.current.deleteLocal(offset, change.rangeLength);
          if (isLive) sendOp(op);
        }
        if (change.text.length > 0) {
          const op = docRef.current.insertLocal(offset, change.text);
          if (isLive) sendOp(op);
        }
      }

      // 自动保存 (仅 live 模式,内容变化后 2s 防抖)
      if (isLive && onSaveRef.current) {
        saveDirtyRef.current = true;
        setSaveState("pending");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          // 卸载后不再 setState,避免无效更新
          if (!isMountedRef.current) return;
          const ed = editorRef.current;
          if (!ed || !saveDirtyRef.current || !onSaveRef.current) return;
          saveDirtyRef.current = false;
          setSaveState("saving");
          try {
            await onSaveRef.current(ed.getValue());
            if (!isMountedRef.current) return;
            setSaveState("saved");
            setSavedAt(Date.now());
          } catch {
            if (!isMountedRef.current) return;
            saveDirtyRef.current = true;
            setSaveState("pending");
          }
        }, 2000);
      }

      // 更新本地光标感知
      const pos = editor.getPosition();
      if (pos) {
        const sel = editor.getSelection();
        const cursor: CursorState = {
          lineNumber: pos.lineNumber,
          column: pos.column,
          selectionStart: sel && !sel.isEmpty()
            ? { lineNumber: sel.startLineNumber, column: sel.startColumn }
            : undefined,
          selectionEnd: sel && !sel.isEmpty()
            ? { lineNumber: sel.endLineNumber, column: sel.endColumn }
            : undefined,
        };
        awarenessRef.current.setLocalCursor(cursor);
        if (isLive) sendCursor(cursor);
      }
    });

    // 光标移动 → 更新感知
    editor.onDidChangeCursorPosition((e) => {
      if (applyingRemote.current) return;
      const sel = editor.getSelection();
      const cursor: CursorState = {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
        selectionStart: sel && !sel.isEmpty()
          ? { lineNumber: sel.startLineNumber, column: sel.startColumn }
          : undefined,
        selectionEnd: sel && !sel.isEmpty()
          ? { lineNumber: sel.endLineNumber, column: sel.endColumn }
          : undefined,
      };
      awarenessRef.current.setLocalCursor(cursor);
      if (isLive) sendCursor(cursor);
    });
  };

  // 渲染远程光标装饰
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

    for (const c of collaborators) {
      if (c.isLocal || !c.online || !c.cursor) continue;
      const { lineNumber, column } = c.cursor;

      // 光标线装饰
      decorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-cursor-${c.id}`,
          beforeContentClassName: `remote-cursor-line-${c.id}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });

      // 选区装饰
      if (c.cursor.selectionStart && c.cursor.selectionEnd) {
        decorations.push({
          range: new monaco.Range(
            c.cursor.selectionStart.lineNumber, c.cursor.selectionStart.column,
            c.cursor.selectionEnd.lineNumber, c.cursor.selectionEnd.column,
          ),
          options: {
            className: `remote-selection-${c.id}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [collaborators]);

  // 注入远程光标 CSS (基于实际在线协作者颜色动态生成)
  // 安全:对协作者名称进行 CSS 转义,颜色用正则校验,防止 CSS 注入
  useEffect(() => {
    const styleId = "collaborative-cursor-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    // 校验颜色为合法 hex 值,否则用回退色
    const safeColor = (color: string): string =>
      /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#787670";
    // CSS 字符串转义:移除能跳出字符串上下文的字符
    const escapeCssStr = (s: string): string =>
      s.replace(/["\\{}<>]/g, "").slice(0, 32);
    const css = collaborators
      .filter((c) => !c.isLocal)
      .map((c) => {
        const color = safeColor(c.color);
        const name = escapeCssStr(c.name);
        return `
        .remote-cursor-line-${c.id} {
          border-left: 2px solid ${color};
          margin-left: -1px;
          animation: cursor-blink-${c.id} 1.1s infinite;
        }
        @keyframes cursor-blink-${c.id} {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
        .remote-selection-${c.id} {
          background-color: ${color}26;
        }
        .remote-cursor-${c.id}::after {
          content: "${name}";
          position: absolute;
          top: -18px;
          left: 0;
          background: ${color};
          color: white;
          font-size: 10px;
          font-family: Inter, sans-serif;
          padding: 1px 5px;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }
      `;
      })
      .join("\n");
    style.textContent = css;
  }, [collaborators]);

  // 跟随模式
  useEffect(() => {
    if (followId === null) return;
    const target = collaborators.find((c) => c.id === followId && c.online && c.cursor);
    if (!target?.cursor) return;
    editorRef.current?.revealLineInCenter(target.cursor.lineNumber);
  }, [followId, collaborators]);

  // 卸载时清理保存定时器和编辑器引用
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      editorRef.current = null;
    };
  }, []);

  const onlineCount = collaborators.filter((c) => c.online).length;

  return (
    <div className="flex flex-col h-full">
      {/* 协作者工具栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-paper">
        <div className="flex items-center gap-4">
          {/* 在线协作者头像组 */}
          <div className="flex items-center -space-x-1.5">
            {collaborators
              .filter((c) => c.online)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFollowId(followId === c.id ? null : c.id)}
                  title={followId === c.id ? `取消跟随 ${c.name}` : `跟随 ${c.name} 的光标`}
                  className={cn(
                    "relative grid place-items-center rounded-full text-white text-label-12 font-medium ring-2 ring-paper transition-transform duration-300 ease-breathe",
                    c.isLocal ? "w-7 h-7" : "w-6 h-6 hover:scale-110",
                    followId === c.id && "ring-[var(--color-accent)] scale-110",
                  )}
                  style={{ backgroundColor: c.color, zIndex: 10 - c.id }}
                >
                  {c.avatarInitial}
                  {c.cursor && !c.isLocal && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success ring-1 ring-paper" />
                  )}
                </button>
              ))}
          </div>
          <span className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">
            <Users className="w-3.5 h-3.5" /> {onlineCount} 人在线
          </span>
          {followId !== null && (
            <span className="flex items-center gap-1 text-label-12 text-[var(--color-accent)]">
              <Radio className="w-3.5 h-3.5" />
              跟随 {collaborators.find((c) => c.id === followId)?.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* live 模式:连接状态 */}
          {isLive && (
            <span
              className={cn(
                "flex items-center gap-1.5 text-label-12 font-mono",
                joined ? "text-success" : "text-[var(--color-warning)]",
              )}
            >
              {joined ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              )}
              {joined ? "已连接" : "连接中…"}
            </span>
          )}

          {/* live 模式:保存状态 */}
          {isLive && onSave && (
            <span className="flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] font-mono">
              {saveState === "saving" && (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  保存中…
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  已保存 {savedAt ? formatTime(savedAt) : ""}
                </>
              )}
              {saveState === "pending" && (
                <>
                  <Save className="w-3.5 h-3.5" />
                  待保存
                </>
              )}
            </span>
          )}

          {/* demo 模式:实时指标 + 启停按钮 */}
          {isDemo && (
            <>
              <span className="hidden sm:flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] font-mono">
                <Wifi className="w-3.5 h-3.5 text-success" /> {latency}ms
              </span>
              <span className="hidden sm:flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] font-mono">
                {opCount} ops
              </span>
              <Button
                variant={running ? "danger" : "primary"}
                size="sm"
                onClick={toggleEngine}
              >
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {running ? "暂停协作" : "启动协作"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* demo 模式:虚拟协作者开关 */}
      {isDemo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-neutral-1 dark:bg-[var(--neutral-1)]">
          <span className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mr-1">
            虚拟协作者
          </span>
          {collaboratorConfigs.map((c) => {
            const active = activeCollabIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCollaborator(c.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-label-12 transition-all duration-300 ease-breathe",
                  active
                    ? "bg-paper ring-1 ring-border text-neutral-8 dark:text-[var(--neutral-8)]"
                    : "text-neutral-5 dark:text-[var(--neutral-5)] hover:text-neutral-7 dark:hover:text-[var(--neutral-7)]",
                )}
              >
                {active ? <UserPlus className="w-3 h-3" style={{ color: c.color }} /> : <UserMinus className="w-3 h-3" />}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Monaco 编辑器 */}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          defaultLanguage={language}
          defaultValue={isDemo ? demoInitial : ""}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          loading={<div className="grid place-items-center h-full text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)]">加载编辑器…</div>}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 21,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            padding: { top: 16, bottom: 16 },
            fontLigatures: true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            // live 模式:未加入房间前只读,避免用户输入被 room_joined 覆盖导致数据丢失
            readOnly: isLive && !joined,
          }}
        />
        {/* live 模式:连接中遮罩 */}
        {isLive && !joined && (
          <div className="absolute inset-0 grid place-items-center bg-paper/60 backdrop-blur-[1px] pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-paper ring-1 ring-border text-label-12 text-neutral-7 dark:text-[var(--neutral-7)] shadow-sm">
              <Loader className="w-3.5 h-3.5 animate-spin text-[var(--color-accent)]" />
              正在加入协作房间…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
