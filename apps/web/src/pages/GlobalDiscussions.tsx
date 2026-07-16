import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Pin, MessagesSquare } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Discussion, User, Repo } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function GlobalDiscussions() {
  const [discussions, setDiscussions] = useState<(Discussion & { repo: Repo })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getRepos(), api.getTeam().catch(() => [])])
      .then(([repoList, team]) => {
        setRepos(repoList);
        setUsers(team);
        return Promise.all(
          repoList.map((r) =>
            api.getDiscussions(r.id).then((list) => list.map((d) => ({ ...d, repo: r }))),
          ),
        );
      })
      .then((grouped) => {
        const all = grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt);
        setDiscussions(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    discussions.forEach((d) => set.add(d.category));
    return ["全部", ...Array.from(set)];
  }, [discussions]);

  const filtered = useMemo(() => {
    const list =
      activeCategory === "全部"
        ? discussions
        : discussions.filter((d) => d.category === activeCategory);
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [discussions, activeCategory]);

  return (
    <div className="space-y-6">
      <div className="reveal flex items-start justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
            跨仓库
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            讨论
          </h1>
          <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
            团队的异步思考与决策留痕，跨仓库汇总。
          </p>
        </div>
        <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
          {loading ? "加载中…" : `${discussions.length} 个`}
        </span>
      </div>

      {/* 分类筛选 */}
      <nav className="reveal reveal-1 flex items-center gap-1 overflow-x-auto border-b border-border">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={cn(
              "px-3.5 py-2 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe",
              activeCategory === c
                ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
            )}
          >
            {c}
          </button>
        ))}
      </nav>

      {/* 讨论列表 */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          : filtered.length === 0
            ? (
              <div className="reveal card text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                <MessagesSquare className="w-8 h-8 mx-auto mb-3 opacity-40" strokeWidth={1.5} />
                暂无讨论
              </div>
            )
            : filtered.map((d, i) => {
                const author = userMap.get(d.authorId);
                const isOpen = expandedId === d.id;
                return (
                  <article
                    key={d.id}
                    className={cn(
                      `reveal reveal-${(i % 6) + 1} card cursor-pointer hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`,
                      d.pinned && "border-l-2 border-[var(--color-accent)]",
                    )}
                    onClick={() => setExpandedId(isOpen ? null : d.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {d.pinned && (
                            <Pin
                              className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0"
                              strokeWidth={1.75}
                            />
                          )}
                          <h3 className="text-copy-15 font-medium text-neutral-9 dark:text-[var(--neutral-9)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
                            {d.title}
                          </h3>
                          <Badge color="var(--color-accent)" variant="soft">
                            {d.category}
                          </Badge>
                        </div>
                        {isOpen && (
                          <p className="mt-3 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed whitespace-pre-wrap">
                            {d.body}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] flex-wrap">
                      {author && (
                        <span className="flex items-center gap-1.5">
                          <Avatar user={author} size="xs" />
                          <span className="text-neutral-7 dark:text-[var(--neutral-7)]">
                            {author.name}
                          </span>
                        </span>
                      )}
                      <Link
                        to={`/repos/${d.repo.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)]"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: d.repo.languageColor }}
                        />
                        {d.repo.name}
                      </Link>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
                        {d.replyCount}
                      </span>
                      <span>·</span>
                      <span>最后活跃 {relativeTime(d.updatedAt)}</span>
                    </div>
                  </article>
                );
              })}
      </div>
    </div>
  );
}
