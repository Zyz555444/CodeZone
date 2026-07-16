import { Link } from "react-router-dom";
import { Hash, Home, BookOpen, MessageSquare, ArrowLeft, Compass } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";

const suggestions = [
  { to: "/dashboard", Icon: Home, label: "工作台", desc: "查看团队动态与待办" },
  { to: "/docs", Icon: BookOpen, label: "文档", desc: "了解如何使用 CodeZone" },
  { to: "/discussions", Icon: MessageSquare, label: "讨论", desc: "参与团队或社区对话" },
];

export default function NotFound() {
  useTitle("页面未找到 · CodeZone");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper text-neutral-9 dark:text-[var(--neutral-9)]">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="relative inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[var(--color-accent-soft)] blur-xl" />
          <span className="relative grid place-items-center w-16 h-16 rounded-2xl bg-[var(--color-accent)] text-white shadow-lg">
            <Compass className="w-7 h-7" strokeWidth={1.75} />
          </span>
        </div>

        <div>
          <p className="font-mono text-caption-10 tracking-eyebrow text-[var(--color-accent)] uppercase">
            Error 404
          </p>
          <h1 className="mt-2 font-serif text-display-48 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            走丢了
          </h1>
          <p className="mt-3 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed">
            这个页面不存在,或链接已失效。先回去看看这些地方吧。
          </p>
        </div>

        <ul className="text-left space-y-2">
          {suggestions.map((s) => (
            <li key={s.to}>
              <Link
                to={s.to}
                className="flex items-center gap-3 p-3 rounded-md ring-1 ring-border hover:ring-[var(--color-accent)] hover:bg-neutral-1 dark:hover:bg-[var(--neutral-2)] transition-shadow"
              >
                <span className="grid place-items-center w-8 h-8 rounded bg-neutral-2 dark:bg-[var(--neutral-2)] text-[var(--color-accent)]">
                  <s.Icon className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{s.label}</span>
                  <span className="block text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)]">{s.desc}</span>
                </span>
                <span className="text-neutral-5">›</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--color-accent)] text-white text-copy-13 hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            返回工作台
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Hash className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            回到首页
          </Link>
        </div>
      </div>
    </div>
  );
}
