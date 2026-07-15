import { useState } from "react";
import {
  AtSign, GitPullRequest, UserCheck, Workflow, UserPlus, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";

type NotificationType = "mention" | "review" | "assign" | "ci" | "follow";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  actorName: string;
}

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

const now = Date.now();
const hour = 3_600_000;
const day = 86_400_000;

const initialNotifications: NotificationItem[] = [
  {
    id: "n1",
    type: "review",
    title: "陈砚秋 请求你评审 PR #142",
    body: "feat: 议题看板支持批量编辑标签与里程碑 — codezone-core",
    createdAt: now - 0.5 * hour,
    read: false,
    actorName: "陈砚秋",
  },
  {
    id: "n2",
    type: "mention",
    title: "苏映雪 在 PR #88 中提到了你",
    body: "@林知白 这块深色模式对比度的处理方案，想听听你的意见。",
    createdAt: now - 2 * hour,
    read: false,
    actorName: "苏映雪",
  },
  {
    id: "n3",
    type: "assign",
    title: "周时砚 将议题 #140 指派给你",
    body: "支持议题批量编辑标签与里程碑 — codezone-core",
    createdAt: now - 5 * hour,
    read: false,
    actorName: "周时砚",
  },
  {
    id: "n4",
    type: "ci",
    title: "流水线通过 · codezone-web",
    body: "main 分支 #1287 全部检查通过，耗时 3m12s。",
    createdAt: now - 8 * hour,
    read: true,
    actorName: "CI 机器人",
  },
  {
    id: "n5",
    type: "ci",
    title: "流水线失败 · codezone-cli",
    body: "main 分支 #418 在「测试」阶段失败，请查看日志定位原因。",
    createdAt: now - 12 * hour,
    read: false,
    actorName: "CI 机器人",
  },
  {
    id: "n6",
    type: "follow",
    title: "顾长青 关注了你",
    body: "你们有 3 个共同协作的仓库，或许可以打个招呼。",
    createdAt: now - 1 * day,
    read: true,
    actorName: "顾长青",
  },
  {
    id: "n7",
    type: "review",
    title: "沈听澜 在 PR #142 上留下了评审评论",
    body: "建议将批量操作抽成独立 hook，便于后续在议题列表中复用。",
    createdAt: now - 1.5 * day,
    read: true,
    actorName: "沈听澜",
  },
  {
    id: "n8",
    type: "mention",
    title: "陈砚秋 在议题 #139 中提到了你",
    body: "@林知白 日志搜索这块你之前做过类似实现，能否复用部分逻辑？",
    createdAt: now - 2 * day,
    read: true,
    actorName: "陈砚秋",
  },
  {
    id: "n9",
    type: "assign",
    title: "苏映雪 将议题 #141 指派给你",
    body: "活动流聚合查询在万条记录后明显变慢 — codezone-core",
    createdAt: now - 3 * day,
    read: true,
    actorName: "苏映雪",
  },
];

type Filter = "all" | "unread" | "mention" | "review" | "assign";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "mention", label: "提及" },
  { key: "review", label: "评审" },
  { key: "assign", label: "指派" },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        {filtered.length === 0 ? (
          <div className="reveal card text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
            没有符合条件的通知
          </div>
        ) : (
          filtered.map((n, i) => {
            const Icon = typeIcon[n.type];
            const color = typeColor[n.type];
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
                      {relativeTime(n.createdAt)} · {n.actorName}
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
