import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, CircleDot, GitPullRequest, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Repo } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ReposList() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .getRepos()
      .then(setRepos)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.name.toLowerCase().includes(q));
  }, [repos, query]);

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <section className="reveal">
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          仓库
        </h1>
        <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
          所有协作中的代码库。留白之间，是团队呼吸的节奏。
        </p>
      </section>

      {/* 搜索 */}
      <section className="reveal reveal-1">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索仓库名…"
            className="w-full rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border pl-9 pr-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow duration-300 ease-breathe"
          />
        </div>
      </section>

      {/* 仓库卡片网格 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))
          : filtered.map((repo, i) => (
              <Link
                key={repo.id}
                to={`/repos/${repo.id}`}
                className={`reveal reveal-${(i % 6) + 1} card flex flex-col hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
              >
                <h3 className="font-mono text-copy-16 text-neutral-10 dark:text-[var(--neutral-10)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
                  {repo.name}
                </h3>
                <p className="mt-2 flex-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed line-clamp-2">
                  {repo.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: repo.languageColor }}
                    />
                    {repo.language}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" strokeWidth={1.75} />
                    {repo.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.75} />
                    {relativeTime(repo.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot className="w-3 h-3" strokeWidth={1.75} />
                    {repo.openIssues}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitPullRequest className="w-3 h-3" strokeWidth={1.75} />
                    {repo.openPRs}
                  </span>
                </div>
              </Link>
            ))}
      </section>

      {!loading && filtered.length === 0 && (
        <div className="reveal text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
          未找到匹配的仓库
        </div>
      )}
    </div>
  );
}
