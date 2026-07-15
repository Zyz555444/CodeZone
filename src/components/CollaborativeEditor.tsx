import { useEffect, useRef, useState, useCallback } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
  Wifi, Users, Radio, Pause, Play, UserPlus, UserMinus,
} from "lucide-react";
import { CRDTText, type TextOp } from "@/lib/crdt";
import { Awareness, type Collaborator, type CursorState } from "@/lib/awareness";
import { VirtualCollaboratorEngine, type VirtualCollaboratorConfig } from "@/lib/virtualCollaborators";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";

interface CollaborativeEditorProps {
  initialCode: string;
  language?: string;
  fileName?: string;
}

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

export default function CollaborativeEditor({
  initialCode: _initial,
  language = "typescript",
  fileName = "TodoList.tsx",
}: CollaborativeEditorProps) {
  const { currentUser } = useAppStore();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const docRef = useRef<CRDTText>(new CRDTText(1, initialCode));
  const awarenessRef = useRef<Awareness>(
    new Awareness({
      id: 1,
      name: currentUser.name,
      color: "#33a6b8",
      avatarInitial: currentUser.name.charAt(0),
    }),
  );
  const engineRef = useRef<VirtualCollaboratorEngine | null>(null);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [running, setRunning] = useState(false);
  const [opCount, setOpCount] = useState(0);
  const [latency, setLatency] = useState(38);
  const [activeCollabIds, setActiveCollabIds] = useState<Set<number>>(new Set([2, 3, 4]));
  const [followId, setFollowId] = useState<number | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // 初始化感知
  useEffect(() => {
    const awareness = awarenessRef.current;
    const unsub = awareness.on(setCollaborators);
    awareness.startHeartbeat();
    setCollaborators(awareness.getAll());

    // 引擎
    const engine = new VirtualCollaboratorEngine(docRef.current, awareness);
    engineRef.current = engine;

    // 监听远程操作,应用到编辑器
    const unsubEngine = engine.on((event) => {
      if (event.type === "op" && event.op) {
        applyRemoteOp(event.op);
        setOpCount((c) => c + 1);
        setLatency(20 + Math.floor(Math.random() * 40));
      }
    });

    return () => {
      unsub();
      unsubEngine();
      engine.stop();
      awareness.stopHeartbeat();
    };
  }, []);

  // 启停引擎
  const toggleEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (running) {
      engine.stop();
      setRunning(false);
    } else {
      // 确保活跃协作者已加入
      for (const id of activeCollabIds) {
        const cfg = collaboratorConfigs.find((c) => c.id === id);
        if (cfg) engine.addCollaborator(cfg);
      }
      engine.start();
      setRunning(true);
    }
  }, [running, activeCollabIds]);

  // 切换协作者在线状态
  const toggleCollaborator = useCallback((id: number) => {
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
  }, [running]);

  // 应用远程操作到 Monaco
  const applyRemoteOp = useCallback((op: TextOp) => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const isRemote = op.client !== 1;
    if (!isRemote) return;

    editor.pushUndoStop();
    if (op.type === "insert") {
      const pos = model.getPositionAt(op.offset);
      const range = new monacoRef.current!.Range(
        pos.lineNumber, pos.column, pos.lineNumber, pos.column,
      );
      model.applyEdits([{ range, text: op.content ?? "" }]);
    } else if (op.type === "delete") {
      const startPos = model.getPositionAt(op.offset);
      const endPos = model.getPositionAt(op.offset + (op.length ?? 0));
      const range = new monacoRef.current!.Range(
        startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column,
      );
      model.applyEdits([{ range, text: "" }]);
    }
    editor.pushUndoStop();
  }, []);

  // Monaco 挂载
  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    // 自定义协作主题
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

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const savedTheme = localStorage.getItem("cz-theme") || "light";
    monaco.editor.setTheme(savedTheme === "dark" ? "codezone-dark" : "codezone-light");

    // 本地编辑 → 同步到 CRDT 文档
    editor.onDidChangeModelContent((e) => {
      const model = editor.getModel();
      if (!model) return;
      const newText = model.getValue();
      const oldText = docRef.current.toString();

      // 计算差异操作
      const ops = CRDTText.diff(oldText, newText, 1, docRef.current.getClock());
      for (const op of ops) {
        docRef.current.applyOp(op);
      }

      // 更新本地光标感知
      const pos = editor.getPosition();
      if (pos) {
        const sel = editor.getSelection();
        awarenessRef.current.setLocalCursor({
          lineNumber: pos.lineNumber,
          column: pos.column,
          selectionStart: sel && !sel.isEmpty()
            ? { lineNumber: sel.startLineNumber, column: sel.startColumn }
            : undefined,
          selectionEnd: sel && !sel.isEmpty()
            ? { lineNumber: sel.endLineNumber, column: sel.endColumn }
            : undefined,
        });
      }
    });

    // 光标移动 → 更新感知
    editor.onDidChangeCursorPosition((e) => {
      const sel = editor.getSelection();
      awarenessRef.current.setLocalCursor({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
        selectionStart: sel && !sel.isEmpty()
          ? { lineNumber: sel.startLineNumber, column: sel.startColumn }
          : undefined,
        selectionEnd: sel && !sel.isEmpty()
          ? { lineNumber: sel.endLineNumber, column: sel.endColumn }
          : undefined,
      });
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

  // 注入远程光标 CSS (每个协作者独立颜色)
  useEffect(() => {
    const styleId = "collaborative-cursor-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    const css = collaboratorConfigs
      .map((c) => `
        .remote-cursor-line-${c.id} {
          border-left: 2px solid ${c.color};
          margin-left: -1px;
          animation: cursor-blink-${c.id} 1.1s infinite;
        }
        @keyframes cursor-blink-${c.id} {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
        .remote-selection-${c.id} {
          background-color: ${c.color}26;
        }
        .remote-cursor-${c.id}::after {
          content: "${c.name}";
          position: absolute;
          top: -18px;
          left: 0;
          background: ${c.color};
          color: white;
          font-size: 10px;
          font-family: Inter, sans-serif;
          padding: 1px 5px;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }
      `)
      .join("\n");
    style.textContent = css;
  }, []);

  // 跟随模式
  useEffect(() => {
    if (followId === null) return;
    const target = collaborators.find((c) => c.id === followId && c.online && c.cursor);
    if (!target?.cursor) return;
    editorRef.current?.revealLineInCenter(target.cursor.lineNumber);
  }, [followId, collaborators]);

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
          {/* 实时指标 */}
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
        </div>
      </div>

      {/* 协作者开关 */}
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

      {/* Monaco 编辑器 */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage={language}
          defaultValue={initialCode}
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
          }}
        />
      </div>
    </div>
  );
}
