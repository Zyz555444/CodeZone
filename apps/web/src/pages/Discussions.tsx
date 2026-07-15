import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { MessageSquare, Pin } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Discussion, User, Repo } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Discussions({ repoId }: { repoId?: string }) {
  const ctx = useOutletContext<{ repo: Repo } | null>();
  const rid = repoId ?? ctx?.repo.id ?? "r1";

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getDiscussions(rid), api.getTeam()])
      .then(([d, u]) => {
        setDiscussions(d);
        setUsers(u);
      })
      .finally(() => setLoading(false));
  }, [rid]);

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
      <div className="reveal">
        <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          讨论
        </h2>
        <p className="mt-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
          团队的异步思考与决策留痕
        </p>
      </div>

      {/* 分类筛选 */}
      <div className="reveal reveal-1 flex items-center gap-1 overflow-x-auto border-b border-border">
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
      </div>

      {/* 讨论列表 */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
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
                  <div className="mt-3 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    {author && (
                      <span className="flex items-center gap-1.5">
                        <Avatar user={author} size="xs" />
                        <span className="text-neutral-7 dark:text-[var(--neutral-7)]">
                          {author.name}
                        </span>
                      </span>
                    )}
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
