import { useEffect, useState } from "react";
import {
  AtSign, GitPullRequest, UserCheck, Workflow, UserPlus, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { AppNotification, NotificationType, User } from "@/lib/types";

const typeIcon: Record<NotificationType, typeof AtSign> = {
  mention: AtSign,
  review: GitPullRequest,
  assign: UserCheck,
  ci: Workflow,
  follow: UserPlus,
};

const typeColor: Record<NotificationType, string> = {
  mention: "#a87a3d",
  review: "var(--color-accent)",
  assign: "#3d6896",
  ci: "#5e9f7e",
  follow: "#787670",
};

const typeLabel: Record<NotificationType, string> = {
  mention: "提及",
  review: "评审",
  assign: "指派",
  ci: "流水线",
  follow: "关注",
};

// 生成柔色背景: hex 直接附 alpha, CSS 变量用 -soft 变体
function softBg(color: string): string {
  if (color.startsWith("var(")) return "var(--color-accent-soft)";
  return `${color}1a`;
}

type Filter = "all" | "unread" | "mention" | "review" | "assign";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "mention", label: "提及" },
  { key: "review", label: "评审" },
  { key: "assign", label: "指派" },
];

// 记忆筛选 — 刷新后保留上次选择
const FILTER_STORAGE_KEY = "codezone.notifications.filter";
const VALID_FILTERS: Filter[] = ["all", "unread", "mention", "review", "assign"];

function readStoredFilter(): Filter {
  try {
    const v = localStorage.getItem(FILTER_STORAGE_KEY) as Filter | null;
    if (v && VALID_FILTERS.includes(v)) return v;
  } catch { /* 忽略 */ }
  return "all";
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [actorMap, setActorMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(readStoredFilter);

  // 切换筛选时写入 localStorage
  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, filter); } catch { /* 忽略 */ }
  }, [filter]);

  useEffect(() => {
    Promise.all([api.getNotifications(), api.getTeam()])
      .then(([list, team]) => {
        setNotifications(list);
        const map: Record<string, User> = {};
        team.forEach((u) => (map[u.id] = u));
        setActorMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      // 静默失败, 前端状态已更新
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      // 静默失败
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题与操作 */}
      <div className="reveal flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            通知
          </h1>
          <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
            所有需要你留意的事 — 提及、评审、指派与流水线，安静地在此等候。
          </p>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          全部标记已读
        </Button>
      </div>

      {/* 筛选 tabs */}
      <nav className="reveal reveal-1 flex items-center gap-1 border-b border-border overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3.5 py-2 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe flex items-center gap-1.5",
              filter === f.key
                ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
            )}
          >
            {f.label}
            {f.key === "unread" && unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-accent)] text-white text-caption-10 font-medium tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 通知列表 */}
      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <div className="reveal card text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
            没有符合条件的通知
          </div>
        ) : (
          filtered.map((n, i) => {
            const Icon = typeIcon[n.type];
            const color = typeColor[n.type];
            const actor = n.actorId ? actorMap[n.actorId] : null;
            const actorName = actor?.name ?? "系统";
            return (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={cn(
                  `reveal reveal-${(i % 6) + 1}`,
                  "w-full text-left card p-0 flex items-stretch hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe",
                  !n.read && "border-l-2 border-[var(--color-accent)]",
                )}
              >
                <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
                  <span
                    className="shrink-0 grid place-items-center w-8 h-8 rounded-full"
                    style={{ backgroundColor: softBg(color) }}
                  >
                    <Icon
                      className="w-icon-sm h-icon-sm"
                      strokeWidth={1.75}
                      style={{ color }}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-copy-14 font-medium text-neutral-10 dark:text-[var(--neutral-10)] truncate">
                        {n.title}
                      </span>
                      <span className="shrink-0 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
                        {typeLabel[n.type]}
                      </span>
                    </div>
                    <p className="mt-1 text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                      {relativeTime(n.createdAt)} · {actorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center pr-4 w-6 justify-center shrink-0">
                  {!n.read && (
                    <span
                      className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0"
                      aria-label="未读"
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
