import { Link } from "react-router-dom";
import { Search, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/store/useAppStore";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-6 lg:px-8 py-3.5 border-b border-border bg-paper/80 backdrop-blur-sm">
      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)] truncate">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* 搜索 — 唤起命令面板 */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md ring-1 ring-border bg-neutral-2 dark:bg-[var(--neutral-2)] w-56 hover:ring-[var(--color-accent)] transition-shadow duration-300 ease-breathe"
      >
        <Search className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" />
        <span className="text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)] flex-1 text-left">
          搜索代码、议题、PR…
        </span>
        <kbd className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] border border-border rounded px-1">
          ⌘K
        </kbd>
      </button>

      {/* 通知 */}
      <button
        onClick={() => (window.location.href = "/notifications")}
        className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)] transition-colors duration-300 ease-breathe relative"
      >
        <Bell className="w-icon-md h-icon-md" strokeWidth={1.75} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
      </button>

      {/* 主题 */}
      <button
        onClick={toggleTheme}
        className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)] transition-colors duration-300 ease-breathe"
        aria-label="切换主题"
      >
        {isDark ? (
          <Sun className="w-icon-md h-icon-md" strokeWidth={1.75} />
        ) : (
          <Moon className="w-icon-md h-icon-md" strokeWidth={1.75} />
        )}
      </button>

      {/* 用户 */}
      <Link to="/profile/u1" className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-80 transition-opacity duration-300 ease-breathe">
        <Avatar user={currentUser} size="sm" />
        <span className="hidden sm:block text-copy-13 text-neutral-8 dark:text-[var(--neutral-8)]">
          {currentUser.name}
        </span>
      </Link>
    </header>
  );
}
