import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, shortSha, formatDate } from "@/lib/format";
import type { Commit, Repo, User } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

interface RepoContext {
  repo: Repo;
}

export default function Commits() {
  const { repo } = useOutletContext<RepoContext>();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCommits(repo.id), api.getTeam()])
      .then(([c, team]) => {
        setCommits(c);
        const map = new Map<string, User>();
        team.forEach((u) => map.set(u.id, u));
        setUserMap(map);
      })
      .finally(() => setLoading(false));
  }, [repo.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Commit[]>();
    for (const c of commits) {
      const key = formatDate(c.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [commits]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden reveal">
      {grouped.map(([date, items]) => (
        <div key={date}>
          <div className="px-4 pt-4 pb-1 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
            {date}
          </div>
          {items.map((commit) => {
            const author = userMap.get(commit.authorId);
            return (
              <div
                key={commit.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
              >
                {/* 作者 */}
                <div className="flex items-center gap-2.5 shrink-0 w-40">
                  {author && <Avatar user={author} size="sm" />}
                  <span className="text-copy-13 text-neutral-8 dark:text-[var(--neutral-8)] truncate">
                    {author?.name ?? commit.authorId}
                  </span>
                </div>

                {/* 提交消息 */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                    {commit.message}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    <span className="font-mono">{shortSha(commit.sha)}</span>
                    <span>·</span>
                    <span>{relativeTime(commit.createdAt)}</span>
                  </div>
                </div>

                {/* 增删统计 */}
                <div className="flex items-center gap-3 font-mono text-label-12 shrink-0">
                  <span className="flex items-center gap-0.5 text-[var(--success)]">
                    <Plus className="w-3 h-3" strokeWidth={1.75} />
                    {commit.additions}
                  </span>
                  <span className="flex items-center gap-0.5 text-[var(--error)]">
                    <Minus className="w-3 h-3" strokeWidth={1.75} />
                    {commit.deletions}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
