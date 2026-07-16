import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookMarked, CircleDot, GitPullRequest,
  MessagesSquare, Workflow, Users, Settings, Hash,
  Bell, Map, Activity as ActivityIcon, Radio, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { to: "/repos", label: "仓库", icon: BookMarked },
  { to: "/collaborate", label: "协作编辑", icon: Radio },
  { to: "/issues", label: "议题", icon: CircleDot },
  { to: "/pulls", label: "合并请求", icon: GitPullRequest },
  { to: "/discussions", label: "讨论", icon: MessagesSquare },
  { to: "/pipelines", label: "流水线", icon: Workflow },
  { to: "/milestones", label: "里程碑", icon: Map },
  { to: "/activity", label: "活动", icon: ActivityIcon },
  { to: "/team", label: "团队", icon: Users },
];

const bottomItems = [
  { to: "/notifications", label: "通知", icon: Bell },
  { to: "/settings", label: "设置", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* 桌面: 固定侧栏 */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-paper/60 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {/* 移动端: 抽屉 */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <aside className="relative h-full w-64 flex flex-col bg-paper dark:bg-[var(--neutral-1)] border-r border-border shadow-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-3 grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
              aria-label="关闭菜单"
            >
              <X className="w-icon-md h-icon-md" strokeWidth={1.75} />
            </button>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-6">
        <NavLink to="/dashboard" onClick={onNavigate} className="group flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent)] text-white">
            <Hash className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <span className="font-logo text-title-20 font-medium tracking-tight text-neutral-10 dark:text-[var(--neutral-10)]">
            CodeZone
          </span>
        </NavLink>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          导航
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-copy-14 transition-colors duration-300 ease-breathe",
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                    : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
                )
              }
            >
              <Icon className="w-icon-md h-icon-md shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          个人
        </p>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-copy-14 transition-colors duration-300 ease-breathe",
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                    : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
                )
              }
            >
              <Icon className="w-icon-md h-icon-md shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
              {item.to === "/notifications" && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 底部说明 */}
      <div className="px-5 py-4 border-t border-border">
        <p className="font-serif text-copy-13 italic text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed">
          专注，是高效协作的开始。
        </p>
        <p className="mt-1 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          CodeZone · 按 ⌘K 唤起命令面板
        </p>
      </div>
    </>
  );
}
