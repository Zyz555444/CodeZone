import { useEffect, useMemo, useState } from "react";
import {
  GitCommit, GitPullRequest, GitMerge, CircleDot, Sparkles, Workflow, ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, User, Repo } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const typeIcon: Record<ActivityType, typeof GitCommit> = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: CircleDot,
  comment: Sparkles,
  pipeline: Workflow,
  merge: GitMerge,
};

type Filter = "all" | ActivityType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "commit", label: "提交" },
  { key: "issue", label: "议题" },
  { key: "pull_request", label: "合并请求" },
  { key: "comment", label: "评论" },
  { key: "pipeline", label: "流水线" },
];

function dateLabel(ts: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  return formatDate(ts);
}

export default function Activity() {
  const [items, setItems] = useState<(Activity & { actor: User; repo: Repo })[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api
      .getActivities(40)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    if (filter === "all") return sorted;
    return sorted.filter((a) => a.type === filter);
  }, [items, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, (Activity & { actor: User; repo: Repo })[]>();
    for (const a of filtered) {
      const label = dateLabel(a.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setItems((prev) => {
        const base = prev.slice(0, 5);
        const extra = base.map((a, i) => ({
          ...a,
          id: `${a.id}-more-${Date.now()}-${i}`,
          createdAt: a.createdAt - 7 * 86_400_000,
        }));
        return [...prev, ...extra];
      });
      setLoadingMore(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
          团队动态
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          活动
        </h1>
        <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
          团队的全部协作动态 — 提交、议题、合并请求、评论与流水线，汇成一条时间线。
        </p>
      </div>

      {/* 筛选 tabs */}
      <nav className="reveal reveal-1 flex items-center gap-1 border-b border-border overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3.5 py-2 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe",
              filter === f.key
                ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {/* 时间线 */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="reveal card text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
          暂无活动
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([label, group], gi) => (
            <section key={label} className={`reveal reveal-${(gi % 6) + 1}`}>
              <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
                {label}
              </h2>
              <div className="relative pl-5">
                {/* 时间轴线 */}
                <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />
                {group.map((a, i) => {
                  const Icon = typeIcon[a.type] ?? Sparkles;
                  return (
                    <div key={a.id} className="relative mb-4">
                      <span className="absolute -left-5 top-3 grid place-items-center w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] ring-4 ring-paper" />
                      <div className="card hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe">
                        <div className="flex items-start gap-3">
                          <Avatar user={a.actor} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)] leading-relaxed">
                              <span className="font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                                {a.actor.name}
                              </span>{" "}
                              {a.description}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                              <span className="flex items-center gap-1">
                                <Icon className="w-3 h-3" strokeWidth={1.75} />
                                {a.repo.name}
                              </span>
                              <span>·</span>
                              <span>{relativeTime(a.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* 加载更多 */}
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={loadMore}
              disabled={loadingMore}
            >
              <ChevronDown className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              {loadingMore ? "加载中…" : "加载更多"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
