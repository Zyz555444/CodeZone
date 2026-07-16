import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookMarked, CircleDot, GitPullRequest,
  MessagesSquare, Workflow, Users, Settings, Hash,
  Bell, Map, Activity as ActivityIcon, Radio, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { to: "/repos", label: "仓库", icon: BookMarked, prefix: ["/repos", "/code"] },
  { to: "/collaborate", label: "协作编辑", icon: Radio },
  { to: "/issues", label: "议题", icon: CircleDot, prefix: ["/issues", "/repos/"] },
  { to: "/pulls", label: "合并请求", icon: GitPullRequest, prefix: ["/pulls"] },
  { to: "/discussions", label: "讨论", icon: MessagesSquare },
  { to: "/pipelines", label: "流水线", icon: Workflow, prefix: ["/pipelines", "/pipeline"] },
  { to: "/milestones", label: "里程碑", icon: Map, prefix: ["/milestones", "/roadmap"] },
  { to: "/activity", label: "活动", icon: ActivityIcon },
  { to: "/team", label: "团队", icon: Users },
];

const bottomItems = [
  { to: "/notifications", label: "通知", icon: Bell },
  { to: "/settings", label: "设置", icon: Settings },
];

/**
 * 路径是否应当高亮给定的 nav 项。
 * - 完全匹配优先
 * - 否则看 prefix(子路由前缀),但要排除掉其他项的前缀误命中
 */
function matchesPath(currentPath: string, item: { to: string; prefix?: string[] }): boolean {
  if (currentPath === item.to) return true;
  if (currentPath.startsWith(item.to + "/")) return true;
  if (item.prefix?.some((p) => currentPath === p || currentPath.startsWith(p + "/"))) return true;
  return false;
}

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

      {/* 移动端: 抽屉 + 半透明遮罩 + ESC 关闭 + 锁滚 */}
      {open && (
        <MobileDrawer onClose={onClose}>
          <SidebarContent onNavigate={onClose} />
        </MobileDrawer>
      )}
    </>
  );
}

function MobileDrawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // 锁定背景滚动;ESC 关闭
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        role="presentation"
        aria-label="关闭菜单"
      />
      <aside
        className="relative h-full w-64 flex flex-col bg-paper dark:bg-[var(--neutral-1)] border-r border-border shadow-2xl animate-fade-in-right"
        aria-label="主导航"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-3 grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors"
          aria-label="关闭菜单"
        >
          <X className="w-icon-md h-icon-md" strokeWidth={1.75} />
        </button>
        {children}
      </aside>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // 常驻轮询未读通知(每 60s 一次),命令面板打开时也会刷新
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api.getUnreadCount()
        .then((r) => { if (!cancelled) setUnread(r.count); })
        .catch(() => { if (!cancelled) setUnread(0); });
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

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
          const isActive = matchesPath(location.pathname, item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-copy-14 transition-colors duration-300 ease-breathe",
                isActive
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                  : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
              )}
              aria-current={isActive ? "page" : undefined}
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
          const isActive = matchesPath(location.pathname, item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-copy-14 transition-colors duration-300 ease-breathe",
                isActive
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                  : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-icon-md h-icon-md shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
              {item.to === "/notifications" && unread > 0 && (
                <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[var(--color-accent)] text-white text-caption-10 font-medium flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 底部说明 */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          按 ⌘K 唤起命令面板
        </p>
      </div>
    </>
  );
}
