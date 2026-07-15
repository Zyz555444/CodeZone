import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, FileCode, FileText, Hash, GitBranch,
  Radio, Zap, Shield, Layers, MessageSquare,
} from "lucide-react";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "TodoList.tsx", icon: FileCode, lang: "typescript", active: true },
  { id: "useDebounce.ts", icon: FileText, lang: "typescript", active: false },
  { id: "types.ts", icon: FileText, lang: "typescript", active: false },
];

export default function CollaboratePage() {
  const [activeTab, setActiveTab] = useState("TodoList.tsx");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* 页面头部 */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/repos"
              className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
            >
              <ArrowLeft className="w-icon-md h-icon-md" strokeWidth={1.75} />
            </Link>
            <div>
              <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-0.5">
                实时协作
              </p>
              <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                协作编辑器
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 text-success text-label-12 font-mono">
              <Radio className="w-3 h-3" /> CRDT 已同步
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] text-neutral-6 dark:text-[var(--neutral-6)] text-label-12">
              <GitBranch className="w-3 h-3" /> feature/realtime-editor
            </span>
          </div>
        </div>
      </div>

      {/* 主体: 编辑器 + 右侧栏 */}
      <div className="flex-1 flex min-h-0">
        {/* 编辑器区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 文件标签 */}
          <div className="flex items-center bg-neutral-1 dark:bg-[var(--neutral-1)] border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-label-12 border-r border-border transition-colors duration-300 ease-breathe",
                    activeTab === tab.id
                      ? "bg-paper text-neutral-9 dark:text-[var(--neutral-9)] font-medium border-b-2 border-b-[var(--color-accent)]"
                      : "text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {tab.id}
                </button>
              );
            })}
            <div className="flex-1" />
            <span className="px-4 text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] font-mono">
              UTF-8 · LF · TypeScript
            </span>
          </div>

          {/* 协作编辑器 */}
          <div className="flex-1 min-h-0 bg-paper">
            <CollaborativeEditor initialCode="" language="typescript" fileName={activeTab} />
          </div>
        </div>

        {/* 右侧信息栏 */}
        <aside className="hidden lg:flex flex-col w-72 border-l border-border bg-paper overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* 技术特性 */}
            <section className="reveal reveal-1">
              <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-3">
                协作引擎
              </p>
              <div className="space-y-3">
                {[
                  { icon: Layers, title: "CRDT 文本合并", desc: "并发编辑无冲突自动收敛,每字符携带逻辑时钟" },
                  { icon: Radio, title: "Awareness 感知", desc: "实时光标、选区、在线状态秒级同步" },
                  { icon: Zap, title: "亚秒级延迟", desc: "操作增量传输,本地即时应用" },
                  { icon: Shield, title: "Tombstone 保留", desc: "删除标记不丢失历史,支持撤销协作" },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex gap-3">
                      <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-copy-13 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{f.title}</p>
                        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 使用提示 */}
            <section className="reveal reveal-2">
              <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
                如何体验
              </p>
              <div className="card p-4 space-y-2.5 text-label-12 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
                <p className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-mono shrink-0">01</span>
                  点击右上 <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">启动协作</span> 按钮
                </p>
                <p className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-mono shrink-0">02</span>
                  虚拟协作者开始编辑,你会看到彩色光标实时移动
                </p>
                <p className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-mono shrink-0">03</span>
                  你可同时输入,CRDT 自动合并并发修改
                </p>
                <p className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-mono shrink-0">04</span>
                  点击协作者头像进入 <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">跟随模式</span>
                </p>
              </div>
            </section>

            {/* 会话信息 */}
            <section className="reveal reveal-3">
              <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
                会话信息
              </p>
              <div className="space-y-2 text-label-12">
                <div className="flex justify-between">
                  <span className="text-neutral-5 dark:text-[var(--neutral-5)]">房间 ID</span>
                  <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">cz-r1-ts-0427</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-5 dark:text-[var(--neutral-5)]">协议</span>
                  <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">CRDT + Awareness</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-5 dark:text-[var(--neutral-5)]">加密</span>
                  <span className="text-success">端到端</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-5 dark:text-[var(--neutral-5)]">最大协作者</span>
                  <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">12</span>
                </div>
              </div>
            </section>

            {/* 评论区占位 */}
            <section className="reveal reveal-4">
              <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> 行内讨论
              </p>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="grid place-items-center w-6 h-6 rounded-full bg-[#a64953] text-white text-caption-10 font-medium">陈</span>
                  <span className="text-label-12 font-medium text-neutral-8 dark:text-[var(--neutral-8)]">陈砚秋</span>
                  <span className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">2 分钟前</span>
                </div>
                <p className="text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
                  这个 <code className="font-mono text-[var(--color-accent)] text-label-12">debounce</code> 的泛型约束可以再收紧一些,用 <code className="font-mono text-[var(--color-accent)] text-label-12">Parameters</code> 就够了。
                </p>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
